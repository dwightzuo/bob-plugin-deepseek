# DeepSeek for Bob

[中文](README.md) | English

Bring DeepSeek translation to [Bob](https://bobtranslate.com/plugin/). The plugin calls the DeepSeek Chat Completions API directly.

- Plugin version: 0.3.0
- Identifier: `local.bob.deepseek`
- Minimum Bob version: 0.10.3
- API: `https://api.deepseek.com/chat/completions`
- Open-source license: [0BSD](LICENSE); commercial use, modification, and redistribution are allowed without attribution

## Install

1. Download and double-click the package: [deepseek-0.3.0.bobplugin](https://github.com/dwightzuo/bob-plugin-deepseek/raw/refs/heads/main/deepseek-0.3.0.bobplugin)
2. In Bob, open **Preferences > Translation > Services > Text Translation** (menu labels may vary by Bob version), click **+**, and choose **DeepSeek**.
3. Enter your own DeepSeek API Key, enable the service, and save.

The API Key is blank by default and must be entered in Bob's service settings. API requests send the source text, target language, and Bearer credential to the official DeepSeek API. The plugin itself does not log requests or keys. Bob manages service settings. The published package contains no personal keys or service configuration; redact keys before sharing settings screenshots.

## Settings

| Option | Default | Description |
| --- | --- | --- |
| DeepSeek API Key | Blank | Enter your own DeepSeek API Key. |
| Model | `deepseek-flash` | Choose `deepseek-flash` or `deepseek-v4-pro`. |
| Custom target language | Blank | When blank, follows Bob's target language; when set, overrides Bob's target. |

Bob's language list provides language routing options; it does not guarantee translation quality for every language. The plugin detects the source language automatically and translates in both directions. For example:

- Set Bob's target language to Simplified Chinese: English → Simplified Chinese.
- Set Bob's target language to English: Chinese → English.
- Set the custom target language to `Icelandic`: translate into Icelandic regardless of Bob's current target language.

Settings labels and error messages show both Chinese and English. A custom target changes the translation request; the result language label in Bob still uses Bob's selected target language.

## Behavior and limits

- Thinking is disabled; requests time out after 55 seconds.
- Source text must contain 1–20,000 UTF-16 code units. A custom target language may contain up to 100 UTF-16 code units.
- Output is limited to `max_tokens: 8192`. Empty output, malformed responses, non-2xx responses, or incomplete generations are returned as errors rather than successful translations.
- Text translation only; no TTS or OCR.
- The plugin is free and open source. DeepSeek API usage may incur separate charges from DeepSeek.

## Troubleshooting

- **401**: Check that the API Key is correct and authorized for API access.
- **402**: Check your DeepSeek account balance or service status.
- **429**: Wait and retry if requests are being rate limited.
- **Connection failure or timeout**: Check your network and retry later; the request timeout is 55 seconds.
- **Incomplete translation**: Shorten the source text and retry; output is capped at 8192 tokens.

## Development

Packaging requires Python 3.9 or later. The deterministic packaging script uses an explicit whitelist and includes only `main.js`, `info.json`, and `LICENSE` in the plugin package:

```sh
python3 package.py
```

Development tests require Node.js 18 or later:

```sh
node --test translate.test.cjs
```

## Links

- [Bob plugin documentation](https://bobtranslate.com/plugin/)
- [DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
