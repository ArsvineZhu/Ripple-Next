<p align="center"><img src="src/assets/icons/icon.png" width="80" alt="Ripple Next"></p>
<h1 align="center">Ripple Next</h1>

<p align="center"><strong>下一步，近在手边。</strong></p>
**简体中文** · [繁體中文](README.zh-TW.md) · [English](README.md) · [日本語](README.ja.md)

音乐正在播放，有个链接要打开，刚复制的命令还在剪贴板里。Ripple Next 把这些日常操作放进一个浮动 Island，适用于 Windows、macOS 和 Linux。

idle 简短显示，悬停查看更多，点击展开完整页面；独立设置窗口负责配置，折叠时草稿仍然保留。

[4.1.0-beta.1 发布准备](docs/releases/4.1.0-beta.1.zh-CN.md)等待 PR #14 合并确认。[下载](https://github.com/ArsvineZhu/Ripple-Next/releases) · [使用指南](instructions.zh-CN.md) · [反馈](https://github.com/ArsvineZhu/Ripple-Next/issues)

> 截图与录像来自独立演示配置中的实际应用。助手使用本地夹具回答，媒体来自演示播放器；中文图片用于介绍对应语言功能。

## 七个页面，伸手就能到

| 页面             | 下一步操作                                        |
| ---------------- | ------------------------------------------------- |
| 浏览器搜索       | 在默认浏览器搜索或打开 HTTP(S) 地址。             |
| 工作流与快捷应用 | 按顺序打开一组应用／地址，或单个常用目标。        |
| 概览             | 查看时间、日期、电量和配置的天气。                |
| 正在播放         | 选择播放器、控制播放并唤起窗口。                  |
| AI 助手          | 使用自选服务与模型，流式阅读 Markdown、复制代码。 |
| 剪贴板           | 重用本次运行内最近复制的文字。                    |
| 任务             | 写下接下来几件事，完成后勾选。                    |

## 音乐，就在手边

封面、歌手和控制留在附近。idle 是较短的胶囊；悬停快览加宽、显示播放／暂停并始终显示歌手。展开卡片可切歌，点击封面唤起对应播放器。

自动来源与播放器指示器方便浏览多来源，控制始终针对当前卡片。长文本在返回时恢复滚动，3D 封面和程度可以调整。Windows／Linux 通过原生事件观察，元数据和封面分别更新。

![Now Playing](docs/assets/screenshots/media.png)

![Compact music](docs/assets/screenshots/media-compact.png)

## 打开一组工作环境

给工作流一个名字，每行放一个应用或地址，一次启动按顺序打开。单个目标失败单独提示，后续继续；快捷应用也能独立启动或复用到工作流。

![Workflows and quick apps](docs/assets/screenshots/workflows.png)

## 自选服务的助手

配置 Chat Completions、OpenAI Responses 或 Anthropic Messages，保存加密密钥并绑定模型。模型可有独立提示词、参数和有序注入；回答流式显示 Markdown，代码块支持原生复制。请求发送到你配置的接口。

![Assistant sample response](docs/assets/screenshots/assistant.png)

## 调成你的样子

选择字体、主题、颜色／背景、显示器、位置、圆角和行为。公共控件保持一致，普通编辑自动保存，凭据和破坏性操作明确提交；设置液态玻璃提供清晰按压透镜、节点吸附与实时预览。

![General settings](docs/assets/screenshots/settings.png)

简体中文提供标准、微软中文、苹果中文。语境提示、空状态和指南拥有不同声音，技术标签、重要操作、错误和日期数字含义保持不变。

![Microsoft Chinese expression](docs/assets/screenshots/chinese-microsoft.png)

![Apple Chinese expression](docs/assets/screenshots/chinese-apple.png)

## 看看实际怎么做

应用指南首先介绍键位，再用实际录像演示字体、中文表达、玻璃、工作流和 AI 编辑。除中文特有演示外使用英文；文字可选择，视频由用户控制播放并在离开可视区时暂停。

- [字体](src/assets/guide/typography.webm)
- [中文表达](src/assets/guide/expression.webm)
- [玻璃](src/assets/guide/appearance.webm)
- [工作流](src/assets/guide/workflow.webm)
- [AI 配置](src/assets/guide/ai.webm)

![Recorded user guide](docs/assets/screenshots/guide.png)

## 开始使用 Ripple Next

下载对应软件包，安装或解压便携 ZIP 后启动。设置首先打开，关闭设置保留 Island；再次启动或通过托盘重新打开设置。

| 平台    | 架构       | 软件包             |
| ------- | ---------- | ------------------ |
| Windows | x64        | MSI／便携 ZIP      |
| Linux   | x64        | DEB／RPM／便携 ZIP |
| macOS   | x64／arm64 | DMG／便携 ZIP      |

macOS 使用临时签名。Linux 需要 X11／XWayland，密钥需要系统安全加密；可选集成工具见[平台支持](docs/platform-compatibility.zh-CN.md)。Island 液态玻璃与 AI 上下文感知尚未开放，Windows／Linux 保留托盘。

偏好、工作流、快捷应用和任务保存在 Ripple Next 用户目录，凭据经系统加密，剪贴板历史属于本次运行。见[使用与数据](instructions.zh-CN.md)、[诊断](docs/diagnostics.zh-CN.md)和[素材来源](docs/assets/screenshots/README.md)。

## 开发与贡献

使用 `.node-version` 的 Node 与 `package.json` 的 pnpm。[开发](docs/development.zh-CN.md)、[架构](docs/architecture.zh-CN.md)、[测试](tests/README.zh-CN.md)及[仓库地图](INDEX.zh-CN.md)说明当前归属和流程。

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm check
pnpm test
```
