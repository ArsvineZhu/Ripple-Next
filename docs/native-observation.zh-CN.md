[English](native-observation.md) · [架构](architecture.zh-CN.md)

# 系统监听与命令执行

Windows 媒体和设备接入共用一个受监督的常驻 MTA 进程。主进程管理快照与来源选择，renderer 订阅变化。命令绑定当前显示的会话，在原生 API 接受或拒绝后返回；元数据与封面解码不阻塞控制执行。

## 原路径的延迟来源

原音乐控制会启动 PowerShell、获取 GSMTC、发送命令，再读取一次元数据和封面。外部切歌还可能等待下一次五秒轮询；蓝牙轮询最多增加十五秒。摄像头与麦克风也分别创建 PowerShell 主机。重复进程／运行时初始化和各窗口独立采样是主要的可避免成本。

新实现使用系统事件：

| 来源                   | 原生接口                                     | 更新方式                                         |
| ---------------------- | -------------------------------------------- | ------------------------------------------------ |
| 媒体会话与当前播放器   | GSMTC SessionsChanged／CurrentSessionChanged | 调整订阅并发布快照                               |
| 播放状态与控制能力     | PlaybackInfoChanged                          | 读取当前播放信息，保留封面缓存                   |
| 歌名、歌手、专辑、封面 | MediaPropertiesChanged                       | 合并 35ms 内的事件，先发布元数据，再异步解码封面 |
| 经典蓝牙与 LE          | 已连接设备选择器与 DeviceWatcher             | 用 Added／Removed／Updated 维护连接集合          |
| 摄像头与麦克风         | ConsentStore 的 RegNotifyChangeKeyValue      | 先重新注册子树通知，再读取采集状态               |

接口资料：[GSMTC 事件](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssession)、[蓝牙选择器](https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.bluetoothdevice.getdeviceselectorfromconnectionstatus)、[DeviceWatcher](https://learn.microsoft.com/en-us/windows/apps/develop/devices-sensors/enumerate-devices)、[注册表通知](https://learn.microsoft.com/en-us/windows/win32/api/winreg/nf-winreg-regnotifychangekeyvalue)。

## 归属与生命周期

`platform/windows/nativeRuntime.cs` 持有 WinRT 对象、事件、控制执行和采集注册表监听；`nativeRuntime.ts` 用系统 .NET Framework 编译器按源码 hash 编译一次，在用户临时目录缓存可执行文件，并监督 JSON 行传输。不下载 Windows SDK 或额外运行时。编译器通过文件路径读取源码，避免超过 Windows 命令行长度上限。

传输共享启动过程，限制帧大小与待处理请求数，按编号匹配响应；命令五秒超时。崩溃会拒绝未完成操作，并按有界退避重新监听，不自动重放命令。标准输入关闭、应用退出或父进程结束都会终止执行器。诊断只包含固定原因和原生错误代码，不记录传输正文与歌曲数据。

平台适配器解释原生快照，媒体服务为所有 renderer 管理唯一的观察／恢复周期：Windows 使用事件与三十秒健康读取，当前 macOS／Linux 后端保留一个五秒查询周期。设置窗口不另建媒体采样器。`onMediaSnapshotChanged` 将自动／手动来源和系统变化同步到两个窗口。设备保留各自失败范围与低频缓存健康检查。

每次媒体属性事件都刷新封面，包含歌名、歌手、专辑未变化的后续封面事件。每个会话的递增代次立即淘汰旧元数据和图片任务；A → B → A 不会让旧 A 图片覆盖新 A。文字身份变化时先清除旧封面；解码失败保留音乐占位图与播放控制。

## 测量与验收

2026-10-14 在当前 Windows 主机与 Folia 上，热状态读取约 0.2–0.7ms；暂停／播放／下一首／上一首命令确认约 2.4–8.4ms，播放器状态或曲目事件约 22–471ms 到达。打包 renderer 的播放／暂停确认约 6–8ms。这些是本机观测，播放器自身解码与发布通知仍计入总延迟。

连续两轮下一首／上一首之后，元数据和封面均与独立新建的 GSMTC 读取器一致，界面图片也与当前快照一致，并返回原曲。中断执行器后，媒体进入过期且不可控制状态，约 1.16 秒恢复。蓝牙与采集初始化返回有效系统状态；实际连接／断开设备与采集变化仍需对应硬件验收。

macOS 播放器字典与 Linux MPRIS 后端保留原生行为。后续事件适配可实现同一可选订阅接口：Linux 接入 PropertiesChanged／NameOwnerChanged，macOS 接入播放器自身的原生通知。核心选择、IPC 和界面无需增加平台分支。
