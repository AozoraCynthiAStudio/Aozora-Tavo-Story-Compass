# Changelog / 更新记录

## 1.0.1 — 2026-10-28

- 优化整条选项的解析与分组，减少标题、路线和摘要被拆成选项的出现频率；兼容多行字段和 text/content 等正文标签。
- 排除空白、不可见字符和占位内容；五条常规路线必须完整才显示成功，不完整时明确提示并提供重试。
- 短剧情、资料稀少时仍要求生成完整五条。保持一次手动请求，不自动增加 API 调用。
- 25 项解析与完整性检查、模拟流程检查通过，并经玩家试用；正式版本仍为 1.0.1，更新对应安装包。
- 偶尔仍出现选项异常时，点击“重试”或“换一批”重新生成即可。

Improves whole-option grouping and body parsing to reduce malformed or incomplete suggestions. Supports multiline fields, rejects placeholders, and offers manual retry for incomplete results. These issues may still occur; use Retry or Reroll if needed. No automatic additional API request is made. The refreshed package retains version 1.0.1 and has 25 parser checks plus mocked-flow and player testing.

## 1.0.0 — 2026-10-27

首个正式版本，基于已体验的开发版 1.0.54 整理；仅统一正式版本标识、说明和 MIT 授权，不更改运行逻辑。

First public release, based on development build 1.0.54. Runtime behavior is unchanged; version labels, documentation, and MIT licensing have been prepared for release.
