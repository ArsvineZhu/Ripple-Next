[English](README.md) · [平台支持](../docs/platform-compatibility.zh-CN.md)

# 原生模块

Linux 的 `linux-events/device_events.c` 通过 inotify 监听 V4L2 打开／关闭和热插拔，空闲时阻塞在内核，发送有界事件行，父进程退出后终止。TypeScript 适配器核对活动持有者并监督重启；Forge 用 `cc` 编译并分发可执行资源。

macOS 的 `macos-window` 是按当前 Node 头文件构建的 N-API 窗口及应用内滚动阶段模块。有界事件桥只观察 Island，保留 Chromium 的事件分发，并在退出时移除监听。Windows 媒体／设备使用平台适配器中的内置 C# 执行器源码。

在对应系统运行 `pnpm build:native`，生成文件保持在忽略的构建／输出目录。见[原生监听](../docs/native-observation.zh-CN.md)及[开发](../docs/development.zh-CN.md)。
