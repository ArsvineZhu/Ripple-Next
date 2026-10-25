[English](release.md) · [开发](development.zh-CN.md)

# 发布流程

[4.1.0-beta.2 发布](https://github.com/ArsvineZhu/Ripple-Next/releases/tag/v4.1.0-beta.2) 提供 Linux x64、Windows x64、macOS x64／arm64 软件包。版本说明对应指定软件包；维护中的指南描述当前应用及可用的发布流程。

## 一个命令发布

每次发布公告均以 Highlights 概括本次更新，随后提供九个软件包的直接下载表、完整产品介绍、安装与入门说明。中英文公告同步维护。

准备 package.json 和中英文版本说明，将获准发布的提交集成到 main。GitHub CLI 已登录，且工作区干净并位于该提交时：

```sh
pnpm release --dry-run
pnpm release
```

预演读取版本并生成两份说明，不创建标签或发布。发布命令核对本地提交与 origin/main，推送匹配标签，跟随 CI 并返回发布地址。CI 在 Linux、Windows、macOS 上运行检查与测试，构建四个目标，将九个软件包附到正式 GitHub Release，并标记为最新版本。版本名含 beta 后缀也按正式版本发布。

同一提交的发布中断后，可再次运行同一命令继续。失败任务会重试，已经公开的标签和附件保持不变。PR 和手动检查不发布，版本标签推送才触发发布。

scripts/release-notes.mjs 整合英文与简体中文说明。尚未公开的草稿可接收构建产物。若已有成功构建，可通过 Publish existing release artifacts 工作流传入草稿标签与构建运行 ID，直接发布而不重新构建。修正已发布软件包时使用新版本。

官网下载按钮指向[最新发行版](https://github.com/ArsvineZhu/Ripple-Next/releases/latest)，后续发版无需修改下载地址。官网产品快照和素材单独同步，见[官网仓库](https://github.com/Arsvine-Devs/ripple-website)。

## 命令与产物

```sh
pnpm check
pnpm test
pnpm package
pnpm make
node scripts/release-notes.mjs v<version>
```

`package` 生成可运行目录，`make` 在对应系统生成安装程序和便携归档。Linux 需要 cc、dpkg、fakeroot、rpm，Windows MSI 需要 WiX，macOS 需要 Xcode 命令行工具。Forge 构建／分发 Linux inotify 程序及目标架构 macOS 窗口模块；macOS 使用临时签名。

DEB／RPM、MSI、DMG 和 ZIP 命名为 `RippleNext-<OS>[-<macOS arch>]-v<version>[-Portable].<ext>`。软件包和临时构建／拍摄资料保存在忽略的 out/。

## 运行验收

- 启动软件包，通过托盘或再次启动打开设置；关闭设置保留 Island，重启确认偏好、任务和工作流。
- 验证岛外穿透、展开／手势、分数缩放、目标显示器，以及焦点、菜单和拖动期间的折叠保护。
- 验证当前播放器控制／唤起、元数据和封面对应、折叠后长文本恢复、idle／快览歌手和按钮、来源选择与原生故障恢复。
- 验证工作流成功／失败、搜索、剪贴板复制、任务完成、天气，以及 AI 协议、取消和部分失败。
- 检查原始字体与声明、趣味中文、键位、原生选色窗口归属、玻璃开关和指南视频播放／跳转／离开可视区暂停。
- 在对应硬件上验证蓝牙／采集变化，在 macOS 主机验证系统窗口行为；按真实主机和操作记录结果。

关闭应用后的 `ripple-next.sqlite` 包含偏好、任务、工作流、快捷应用和加密凭据。移动／更新配置目录前备份，并验证数据和密钥可用性。当前持久结构由源 schema 和 appStateStore 管理。

见[平台支持](platform-compatibility.zh-CN.md)、[架构](architecture.zh-CN.md)和[素材来源](assets/screenshots/README.md)。
