[English](release.md) · [开发](development.zh-CN.md)

# 发布流程

[4.1.0-beta.2 发布](https://github.com/ArsvineZhu/Ripple-Next/releases/tag/v4.1.0-beta.2) 提供 Linux x64、Windows x64、macOS x64／arm64 软件包。版本说明对应指定软件包；维护中的指南描述当前应用及可用的发布流程。

## CI 与发布

在 main 上经审查并获准发布的提交创建版本标签，标签必须与 package.json 一致。标签 CI 校验版本，在 Linux、Windows、macOS 上运行检查和测试，再构建四个目标；全部构建成功后才创建 GitHub Release。带预发布后缀的标签创建预发布，普通版本标签创建稳定发布。

PR 检查不发布版本，手动运行工作流只检查所选 ref，也不发布。来自 fork 的贡献应在集成后使用版本标签流程：`actions/checkout@v7` 拒绝在 `pull_request_target` 事件中检出 fork 代码，工作流中的 PR #14 合并事件路径也受此限制。保持这项保护开启。

发布读取英文／简体中文说明，通过 `scripts/release-notes.mjs` 将仓库链接解析到发布标签。已有发布保留原始附件；已发布标签和软件包保持不变，修正应使用新版本。

准备新版本时，同步更新 package.json 和锁文件，准备两份版本说明，取得发布批准，确认目标提交后再创建并推送标签。最后核对工作流成功、标签指向该提交、说明一致，以及九个附件均已上传且可下载。直接向 main 推送文档不会发布新版本。

已有构建成功的软件包时，可运行 **Publish existing release artifacts**，传入标签和构建运行 ID。该工作流将对应产物附到已准备的正式发布草稿并公开，无需重新构建。

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
