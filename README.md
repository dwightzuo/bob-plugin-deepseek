# DeepSeek for Bob

中文 | [English](README.en.md)

为 [Bob](https://bobtranslate.com/plugin/) 提供 DeepSeek 翻译。插件直接调用 DeepSeek Chat Completions API。

- 插件版本：0.3.0
- 插件标识：`local.bob.deepseek`
- Bob 最低版本：0.10.3
- API：`https://api.deepseek.com/chat/completions`
- 开源许可证：[0BSD](LICENSE)，允许商用、修改和再分发，无需署名

## 安装

1. 下载并双击安装包：[deepseek-0.3.0.bobplugin](https://github.com/dwightzuo/bob-plugin-deepseek/raw/refs/heads/main/deepseek-0.3.0.bobplugin)
2. 在 Bob 中打开 **偏好设置 > 翻译 > 服务 > 文本翻译**（不同版本的入口名称可能略有差异），点击 **+** 并选择 **DeepSeek**。
3. 填入自己的 DeepSeek API Key，启用服务并保存。

API Key 默认留空，需要在 Bob 的服务设置中填写。API 调用会将原文、目标语言和 Bearer 凭证发送到官方 DeepSeek API；插件本身不记录请求或密钥。服务设置由 Bob 管理；发布包不包含个人密钥或服务配置，分享设置截图时请遮盖密钥。

## 设置

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| DeepSeek API Key | 空 | 填入你自己的 DeepSeek API Key。 |
| 模型 | `deepseek-flash` | 可选 `deepseek-flash` 或 `deepseek-v4-pro`。 |
| 自定义目标语言 | 空 | 留空时跟随 Bob 的目标语言；填写后覆盖 Bob 的目标语言。 |

Bob 的语言列表用于路由语言选项，不代表对每种语言的翻译质量保证。插件自动检测原文语言，可双向翻译，例如：

- Bob 目标语言设为简体中文：英文 → 简体中文。
- Bob 目标语言设为 English：中文 → 英文。
- 自定义目标语言填写 `Icelandic`：将原文翻译为冰岛语，无论 Bob 当前目标语言为何。

设置项和错误提示同时显示中文与英文。自定义目标语言只改变翻译请求；Bob 的结果语言标签仍显示 Bob 当前选定的目标语言。

## 行为与限制

- 关闭思考模式；请求超时为 55 秒。
- 原文长度为 1–20,000 个 UTF-16 代码单元；自定义目标语言最多 100 个 UTF-16 代码单元。
- 输出上限为 `max_tokens: 8192`。空结果、无效响应、非 2xx 响应或未完整生成的译文会作为错误返回，不会当作成功译文显示。
- 仅提供文本翻译，不提供 TTS 或 OCR。
- 插件免费且开源；DeepSeek API 的使用可能产生费用，费用由 DeepSeek 另行计收。

## 故障排查

- **401**：检查 API Key 是否正确，并确认该密钥有权调用 API。
- **402**：检查 DeepSeek 账户余额或服务状态。
- **429**：请求过于频繁时稍后重试。
- **连接失败或超时**：检查网络，稍后重试；请求超时为 55 秒。
- **译文未完整生成**：缩短原文后重试；输出最多为 8192 tokens。

## 开发

打包需要 Python 3.9 或更高版本。脚本使用确定性白名单，仅将 `main.js`、`info.json` 和 `LICENSE` 写入插件包：

```sh
python3 package.py
```

开发测试需要 Node.js 18 或更高版本：

```sh
node --test translate.test.cjs
```

## 相关链接

- [Bob 插件文档](https://bobtranslate.com/plugin/)
- [DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
