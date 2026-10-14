[English](release.md) · [开发](development.zh-CN.md)

# 发布流程

4.1.0-beta.1 在 [PR #14](https://github.com/ArsvineZhu/Ripple-Next/pull/14) 中准备。用户先检查最终代码、发布说明、截图／录像与软件包，再确认合并；确认前保持未发布。

## 确认与发布

工作流在 Linux、Windows、macOS 上检查。PR #14 还生成 Linux x64、Windows x64、macOS x64／arm64 候选软件包，供合并前审查，不发布。

用户批准且 PR #14 合并到 main 后，仅合并触发的工作流检出合并提交，重新验证并构建，创建 `v4.1.0-beta.1` 标签、GitHub 预发布和软件包。未合并而关闭 PR 不会发布；普通 PR 构建没有发布写权限，发布只使用已合并的提交。

与 package.json 版本一致的标签推送也运行发布路径。发布使用英文／简体中文说明，`scripts/release-notes.mjs` 去除本地待确认状态行，并将仓库链接解析到发布标签；重复执行保留已有发布的原始附件。

## 候选命令与产物

```sh
pnpm check
pnpm test
pnpm package
pnpm make
node scripts/release-notes.mjs v4.1.0-beta.1
```

`package` 生成可运行目录，`make` 在对应系统生成安装程序和便携归档。Linux 需要 cc、dpkg、fakeroot、rpm，Windows MSI 需要 WiX，macOS 需要 Xcode 命令行工具。Forge 构建／分发 Linux inotify 程序及目标架构 macOS 窗口模块；macOS 使用临时签名。

DEB／RPM、MSI、DMG 和 ZIP 命名为 `RippleNext-<OS>[-<macOS arch>][-Portable]-v<version>.<ext>`。软件包和临时构建／拍摄资料保存在忽略的 out/。

## 运行验收

- 启动软件包，通过托盘或再次启动打开设置；关闭设置保留 Island，重启确认偏好、任务和工作流。
- 验证岛外穿透、展开／手势、分数缩放、目标显示器，以及焦点、菜单和拖动期间的折叠保护。
- 验证当前播放器控制／唤起、元数据和封面对应、折叠后长文本恢复、idle／快览歌手和按钮、来源选择与原生故障恢复。
- 验证工作流成功／失败、搜索、剪贴板复制、任务完成、天气，以及 AI 协议、取消和部分失败。
- 检查原始字体与声明、趣味中文、键位、原生选色窗口归属、玻璃开关和指南视频播放／跳转／离开可视区暂停。
- 在对应硬件上验证蓝牙／采集变化，在 macOS 主机验证系统窗口行为；按真实主机和操作记录结果。

关闭应用后的 `ripple-next.sqlite` 包含偏好、任务、工作流、快捷应用和加密凭据。移动／更新配置目录前备份，并验证数据和密钥可用性。当前持久结构由源 schema 和 appStateStore 管理。

见[平台支持](platform-compatibility.zh-CN.md)、[架构](architecture.zh-CN.md)和[素材来源](assets/screenshots/README.md)。
