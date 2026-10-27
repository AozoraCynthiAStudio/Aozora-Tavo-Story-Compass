# Changelog / 更新记录

## 1.0.1 — 2026-10-28

- 修复只有标题或路线信息的块被误当作正文；兼容模型使用 text/content 等正文标签。
- 排除空白、不可见字符和占位内容；五条常规路线必须完整才显示成功，不完整时明确提示并提供重试。
- 短剧情、资料稀少时仍要求生成完整五条。保持一次手动请求，不自动增加 API 调用。
- 新增 15 项解析与完整性检查；本地模拟界面验证通过，真实模型表现仍需实际体验。

Reject empty or metadata-only suggestions, accept common body aliases, and require five complete regular routes before displaying success. Incomplete results show a clear retry state. No automatic additional API request is made. Added parser/completeness regression checks; live model behavior remains unverified.

## 1.0.0 — 2026-10-27

首个正式版本，基于已体验的开发版 1.0.54 整理；仅统一正式版本标识、说明和 MIT 授权，不更改运行逻辑。

First public release, based on development build 1.0.54. Runtime behavior is unchanged; version labels, documentation, and MIT licensing have been prepared for release.
