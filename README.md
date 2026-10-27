# Aozora剧情罗盘 / Aozora Story Compass

为 Tavo RP 提供新的剧情可能。按需生成五条路线灵感，独立面板展示，复制后自由修改。

An on-demand story inspiration plugin for Tavo, featuring five routes, conditional special paths, and editable suggestions.

## 中文

### 功能

- 需要时再点开，单独调用文本 AI；不与正文同一轮生成。
- 五个方向：交集、线索、抉择、开拓、亲密，为新人物交集和剧情变化提供入口。
- 独立面板，不依赖正则叠加美化。
- 选项复制到输入框，可自行修改后发送。
- 符合剧情条件时，可能追加不同配色的特殊走向。
- 等待时可以隐藏；当前剧情仍有效时，成功完成后自动打开。
- 支持换一批和诊断日志导出。

### 安装与使用

需要 Tavo 1.3.0 或更高版本，并配置可用的文本 AI。

1. 从本仓库 Releases 下载 Aozora剧情罗盘_v1.0.0.tpg，并在 Tavo 的插件管理中导入、启用。
2. 在最新角色回复的操作区点击剧情罗盘。
3. 选择灵感，点击复制到输入框，自行修改后发送。

### 使用说明

每次生成或换一批会额外调用一次文本 API；速度和费用取决于模型、服务及上下文。适合按需寻找思路，不是每轮自动附带选项。内容可能遗漏或误解部分剧情、记忆和设定，请按实际故事调整。特殊走向由模型依据剧情判断，并非每轮必出。

诊断日志默认不记录聊天、人物卡、世界书或完整生成文本。向他人分享日志前仍请检查内容；Tavo 自身导出的上下文日志与本插件诊断日志不同。

## English

### Features

- Generate ideas when needed, through a separate text AI request.
- Five routes: Encounters, Clues, Choices, Exploration, and Intimacy.
- A dedicated panel without regex-based decoration.
- Copy a suggestion into the composer and edit it before sending.
- An optional, visually distinct special path when supported by the story.
- Hide while generating; successful results reopen automatically if the scene is still current.
- Reroll suggestions and export diagnostic logs.

### Installation

Requires Tavo 1.3.0 or later and a configured text AI service. Import the .tpg package from Releases in Tavo's plugin manager, enable it, then select the compass action on the latest character reply.

Each generation or reroll makes an additional text AI call. Latency and cost depend on your model, provider, and context. Suggestions may misunderstand or omit story facts and should be reviewed. This plugin does not automatically add choices to every reply.

### Source and build

Runtime files are in plugin/. On Windows, run powershell -File scripts/build.ps1 to create the installable .tpg in dist/. No npm dependencies are required to package it; Node.js is needed for JavaScript syntax checks.

## License

MIT © 2026 Aozora. See LICENSE.
