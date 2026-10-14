[English](README.md)

# Preload 桥接层

`launchTargets(targets)` 用同一目标数组启动一个快捷应用或整个工作流。Main 校验并按顺序尝试每项，返回带序号的失败。`discoverApps(query)` 返回共享 Application；不再暴露应用缓存准备或原始名称启动方法。

媒体读取返回会话快照。`selectMediaSession` 选择自动模式或已知会话，`controlSystemMedia` 必须携带所显示会话的 ID；两者都返回刷新状态和操作错误。`openMediaSession` 使用已知会话标识唤起对应播放器，不等待额外的媒体读取，返回当前快照和操作错误。Renderer 不直接接触 D-Bus 或 PowerShell。

Preload 通过明确的 `contextBridge` 方法暴露隔离的 `electronAPI`，并将类型化调用和事件映射到[共享契约](../shared/README.zh-CN.md)中的命名 IPC channel。Renderer 只使用这些方法，不接触原始 `ipcRenderer`。

桥接接口包括状态快照与补丁、类型化 AI 配置命令、命名凭据写入、凭据存在标记、主进程天气快照、许可列表与读取、AI 流及原生控件。仅设置窗口可修改 AI 配置或写入凭据，密钥明文不会通过启动状态或查询返回。Preload 校验请求及事件形状，不暴露原始 invoke API。

保持 preload bundle 兼容 sandbox；调整方法时同步更新 shared 请求、响应和事件契约。

参见[开发指南](../../docs/development.zh-CN.md)和[仓库地图](../../INDEX.zh-CN.md)。

桥接还提供 `readClipboardText()` 和 `writeClipboardText(text)`，使用 Electron 原生剪贴板接口，避免桌面失焦时浏览器权限路径失败。

`onScrollGestureStart(callback)` 通过 `scroll-gesture-start` 传递经过校验的原生触控板手势开始时间戳，并返回取消订阅函数；不暴露原始输入事件、鼠标坐标或按键内容。

`setIslandPreview(active)` 仅允许设置窗口调用；`getIslandPreview()` 和 `onIslandPreviewChanged()` 将临时预览状态同步给 Island，订阅返回清理函数。预览状态不持久化。

`showColorPicker(initialColor)` 打开设置窗口所属的原生 RGB 选择器，返回六位 hex，取消时返回 null；发送方及参数由 main 校验。
`updateAppState` 统一提交偏好，包含显示器及自启动效果；独立 set-display／set-auto-launch 通道已删除。`getWeather` 接收共享 WeatherPreferences，不再传输位置元组、拼接查询或自动定位哨兵字符串。

reportDiagnostic 通过 renderer-diagnostic 仅发送校验后的页面上下文和安全错误元信息；main 核验窗口身份与上下文角色，不开放通用 logger、控制台代理或额外日志 preload。
