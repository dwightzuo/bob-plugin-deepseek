const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const pluginDir = __dirname;
const source = fs.readFileSync(path.join(pluginDir, 'main.js'), 'utf8');
const info = JSON.parse(fs.readFileSync(path.join(pluginDir, 'info.json'), 'utf8'));
const testKey = 'test-only-placeholder';

function runTranslate({
  options = { apiKey: testKey, model: 'deepseek-flash', targetLanguage: '' },
  query = { text: 'Hello', from: 'en', detectFrom: 'en', to: 'zh-Hans', detectTo: 'zh-Hans' },
  response,
  requestThrows,
} = {}) {
  let request;
  let callback;
  const logs = [];
  const sandbox = {
    $option: options,
    $http: {
      request(value) {
        request = value;
        if (requestThrows) throw requestThrows;
        callback = value.handler;
      },
    },
    console: {
      log(...args) { logs.push(args); },
      info(...args) { logs.push(args); },
      warn(...args) { logs.push(args); },
      error(...args) { logs.push(args); },
    },
  };
  vm.runInNewContext(source, sandbox, { filename: 'main.js' });
  let result;
  sandbox.translate(query, value => { result = value; });
  if (callback) callback(response);
  return { request, result, logs };
}

function okResponse(content, statusCode = 200) {
  return {
    response: { statusCode },
    data: { choices: [{ message: { content }, finish_reason: 'stop' }] },
  };
}

test('metadata keeps the local identifier, 0.3.0 version, and Bob 0.10.3 minimum', () => {
  assert.equal(info.identifier, 'local.bob.deepseek');
  assert.equal(info.version, '0.3.0');
  assert.equal(info.minBobVersion, '0.10.3');
  const keyOption = info.options.find(option => option.identifier === 'apiKey');
  assert.equal(keyOption.defaultValue, '');
});

test('English to Chinese translation preserves paragraphs and request semantics', () => {
  const input = 'Hello, world.\nKeep this paragraph.';
  const output = '你好，世界。\n保留这一段。';
  const { request, result } = runTranslate({
    query: { text: input, from: 'en', detectFrom: 'en', to: 'zh-Hans', detectTo: 'zh-Hans' },
    response: okResponse(output),
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    result: { from: 'en', to: 'zh-Hans', toParagraphs: ['你好，世界。', '保留这一段。'] },
  });
  assert.equal(request.method, 'POST');
  assert.equal(request.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(request.timeout, 55);
  assert.match(request.body.messages[0].content, /Target language: zh-Hans$/);
  assert.deepEqual(JSON.parse(JSON.stringify(request.body)), {
    model: 'deepseek-flash',
    stream: false,
    thinking: { type: 'disabled' },
    max_tokens: 8192,
    messages: [
      { role: 'system', content: request.body.messages[0].content },
      { role: 'user', content: input },
    ],
  });
});

test('Chinese to English translation and V4 Pro model selection work', () => {
  const { request, result } = runTranslate({
    options: { apiKey: testKey, model: 'deepseek-v4-pro', targetLanguage: '' },
    query: { text: '你好', from: 'zh-Hans', detectFrom: 'zh-Hans', to: 'en', detectTo: 'en' },
    response: okResponse('Hello'),
  });

  assert.equal(request.body.model, 'deepseek-v4-pro');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    result: { from: 'zh-Hans', to: 'en', toParagraphs: ['Hello'] },
  });
});

test('custom target overrides the prompt target while result.to remains Bob language code', () => {
  const { request, result } = runTranslate({
    options: { apiKey: testKey, model: 'deepseek-flash', targetLanguage: ' Icelandic ' },
    query: { text: 'Hello', from: 'en', detectFrom: 'en', to: 'zh-Hans', detectTo: 'zh-Hans' },
    response: okResponse('Halló'),
  });

  assert.match(request.body.messages[0].content, /Target language: Icelandic$/);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    result: { from: 'en', to: 'zh-Hans', toParagraphs: ['Halló'] },
  });
});

test('API key is trimmed and appears only in the Authorization header', () => {
  const secret = 'test-only-placeholder';
  const { request, logs } = runTranslate({
    options: { apiKey: `  ${secret}  `, model: 'deepseek-flash', targetLanguage: '' },
    response: okResponse('你好'),
  });

  assert.deepEqual(JSON.parse(JSON.stringify(request.header)), {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
  });
  assert.equal(JSON.stringify(request.body).includes(secret), false);
  assert.equal(logs.length, 0);
});

test('missing key, invalid text, target, and model fail without an HTTP request', async t => {
  const cases = [
    ['missing key', { apiKey: '   ', model: 'deepseek-flash', targetLanguage: '' }, { text: 'Hello', to: 'en' }],
    ['empty text', { apiKey: testKey, model: 'deepseek-flash', targetLanguage: '' }, { text: '  ', to: 'en' }],
    ['missing text', { apiKey: testKey, model: 'deepseek-flash', targetLanguage: '' }, { to: 'en' }],
    ['missing target', { apiKey: testKey, model: 'deepseek-flash', targetLanguage: '' }, { text: 'Hello' }],
    ['auto target', { apiKey: testKey, model: 'deepseek-flash', targetLanguage: '' }, { text: 'Hello', to: 'auto' }],
    ['invalid model', { apiKey: testKey, model: 'unapproved-model', targetLanguage: '' }, { text: 'Hello', to: 'en' }],
  ];

  for (const [name, options, query] of cases) {
    await t.test(name, () => {
      const { request, result } = runTranslate({ options, query });
      assert.equal(request, undefined);
      assert.equal(result.error.type, 'param');
      assert.equal(typeof result.error.message, 'string');
    });
  }
});

test('accepts the 20,000 UTF-16 code-unit source boundary and rejects 20,001', () => {
  const accepted = runTranslate({
    query: { text: '😀'.repeat(10000), to: 'en' },
    response: okResponse('ok'),
  });
  assert.ok(accepted.request);
  assert.equal(accepted.request.body.messages[1].content.length, 20000);

  const rejected = runTranslate({
    query: { text: '😀'.repeat(10000) + 'a', to: 'en' },
  });
  assert.equal(rejected.request, undefined);
  assert.equal(rejected.result.error.type, 'param');
});

test('accepts 100 UTF-16 code units for target and rejects 101', () => {
  const accepted = runTranslate({
    options: { apiKey: testKey, model: 'deepseek-flash', targetLanguage: 'x'.repeat(100) },
    query: { text: 'Hello', to: 'en' },
    response: okResponse('ok'),
  });
  assert.ok(accepted.request);

  const rejected = runTranslate({
    options: { apiKey: testKey, model: 'deepseek-flash', targetLanguage: 'x'.repeat(101) },
    query: { text: 'Hello', to: 'en' },
  });
  assert.equal(rejected.request, undefined);
  assert.equal(rejected.result.error.type, 'param');
});

test('401, 402, 429, and 5xx return sanitized errors even when response.error exists', async t => {
  for (const [statusCode, messagePart] of [
    [401, 'unauthorized'], [402, 'Insufficient'], [429, 'Rate limited'], [503, 'temporarily unavailable'],
  ]) {
    await t.test(String(statusCode), () => {
      const { result, logs } = runTranslate({
        response: { ...okResponse('must not be accepted', statusCode), error: { secret: 'upstream-secret' } },
      });
      assert.equal(result.error.type, 'api');
      assert.match(result.error.message, new RegExp(messagePart, 'i'));
      assert.equal(JSON.stringify(result).includes('upstream-secret'), false);
      assert.equal(logs.length, 0);
    });
  }
});

test('other non-2xx responses fail even if they contain valid-looking choices', () => {
  const { result } = runTranslate({ response: okResponse('must not be accepted', 418) });
  assert.equal(result.error.type, 'api');
  assert.match(result.error.message, /HTTP 418/);
  assert.equal(result.result, undefined);
});

test('missing status, null response, malformed data, empty output, and incomplete output fail', async t => {
  const cases = [
    ['missing status', { data: { choices: [] } }],
    ['null response', null],
    ['malformed choices', { response: { statusCode: 200 }, data: { choices: [] } }],
    ['empty translation', okResponse(' \n ')],
    ['incomplete translation', { ...okResponse('partial'), data: { choices: [{ message: { content: 'partial' }, finish_reason: 'length' }] } }, 'incomplete'],
  ];

  for (const [name, response, expected] of cases) {
    await t.test(name, () => {
      const { result } = runTranslate({ response });
      assert.equal(result.error.type, 'api');
      if (expected) assert.match(result.error.message, new RegExp(expected, 'i'));
      assert.equal(result.result, undefined);
    });
  }
});

test('synchronous request exceptions are sanitized and do not log raw errors', () => {
  const { result, logs } = runTranslate({ requestThrows: new Error('sensitive-test-error') });
  assert.equal(result.error.type, 'api');
  assert.match(result.error.message, /Unable to start/);
  assert.equal(JSON.stringify(result).includes('sensitive-test-error'), false);
  assert.equal(logs.length, 0);
});
