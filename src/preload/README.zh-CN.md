[English](README.md)

# Preload 桥接层

媒体读取返回会话快照。`selectMediaSession` 选择自动模式或已知会话，`controlSystemMedia` 必须携带所显示会话的 ID；两者都返回刷新状态和操作错误。`openMediaSession` 使用已知会话标识唤起对应播放器，不等待额外的媒体读取，返回当前快照和操作错误。Renderer 不直接接触 D-Bus 或 PowerShell。

Preload 通过明确的 `contextBridge` 方法暴露隔离的 `electronAPI`，并将类型化调用和事件映射到[共享契约](../shared/README.zh-CN.md)中的命名 IPC channel。Renderer 只使用这些方法，不接触原始 `ipcRenderer`。

桥接接口包括应用状态载入与更新、安全 API key 保存/移除、快捷应用发现与启动、AI 流事件和取消、应用内通知、语言、媒体、自动启动、显示器及窗口输入区域。API key 交由 main 保存，不出现在启动状态响应中。

保持 preload bundle 兼容 sandbox；调整方法时同步更新 shared 请求、响应和事件契约。

参见[开发指南](../../docs/development.zh-CN.md)和[仓库地图](../../INDEX.zh-CN.md)。

桥接还提供 `readClipboardText()` 和 `writeClipboardText(text)`，使用 Electron 原生剪贴板接口，避免桌面失焦时浏览器权限路径失败。

`onScrollGestureStart(callback)` 通过 `scroll-gesture-start` 传递经过校验的原生触控板手势开始时间戳，并返回取消订阅函数；不暴露原始输入事件、鼠标坐标或按键内容。

`setIslandPreview(active)` 仅允许设置窗口调用；`getIslandPreview()` 和 `onIslandPreviewChanged()` 将临时预览状态同步给 Island，订阅返回清理函数。预览状态不持久化。
