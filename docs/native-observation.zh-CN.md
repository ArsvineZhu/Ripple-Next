[English](native-observation.md) · [架构](architecture.zh-CN.md)

# 原生监听与控制

主进程为双窗维护唯一媒体快照与来源选择，平台适配器管理原生订阅、缓存和准备。控制针对当前会话且不自动重放，元数据／图片工作独立于播放控制路径。

## 事件与采样来源

| 平台／来源             | 原生接口                                  | 更新行为                                                 |
| ---------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Windows 媒体           | GSMTC 管理器及会话事件                    | 核对会话／当前来源，发布状态／能力和元数据，封面异步解码 |
| Windows 蓝牙           | Classic／LE DeviceWatcher                 | 通过加入／退出／更新维护连接状态                         |
| Windows 摄像头／麦克风 | ConsentStore 注册表通知                   | 先重新监听子树，再读取采集活动                           |
| Linux 媒体             | MPRIS NameOwnerChanged／PropertiesChanged | 维护唯一 owner 会话，属性直接更新缓存元数据              |
| Linux 蓝牙             | BlueZ ObjectManager／Device1 信号         | 服务／设备变化时读取连接集合                             |
| Linux 麦克风／门户视频 | `pw-dump --monitor --no-colors`           | 应用节点增量更新／删除，运行中的输入流决定活动           |
| 仅 PulseAudio 的麦克风 | `pactl subscribe`                         | 缺少 pw-dump 时，合并 source-output／server 事件后读取   |
| Linux V4L2 摄像头      | 内置 C inotify 程序                       | 监听打开／关闭和热插拔，通过 fuser 核对持有者            |
| macOS 媒体／设备       | 运行中播放器字典及设备探测                | 主进程管理媒体备用采样，设备 hook 采样支持的来源         |
| 电池                   | Chromium 电池事件                         | 直接更新充电及电量                                       |

Windows／Linux 事件后端正常时不周期采样。设备 hook 订阅一次，读取期间再次到达事件时补读；剪贴板文字使用独立的两秒／焦点采样。

## 元数据与图片生命周期

MPRIS ID 含唯一 owner，过期命令不能操作替代播放器。信号立即更新元数据，本地图片按扩展名或签名识别，上限 5 MiB。元数据先发布，封面 I/O 独立完成；缺失或失败图片不影响控制。

新封面代次淘汰旧图片工作，包括复用同一临时网址的元数据更新；A → B → A 不会使较早 A 的结果重新有效。新文字会清掉旧封面，等待当前图片；界面解码失败显示音乐占位图，来源／会话变化时重试。

## 监督与清理

Windows nativeRuntime.ts 监督常驻 MTA 进程及有界 JSON 行请求，通过系统编译器按源 hash 编译内置 C#。启动、帧／请求上限和五秒控制期限限制传输；失败拒绝待完成请求并退避恢复，EOF／父进程／应用退出后结束。

Linux signalBus.ts 管理匹配规则和替代 D-Bus 连接，nativeStream.ts 管理常驻事件来源、启动／帧限制和最多 30 秒的指数恢复；pipewire.ts 解析增量 JSON 并合并状态／属性。inotify 程序空闲时阻塞在内核，父进程退出后终止。Forge 分发 Linux 监听器和目标架构 macOS 窗口模块。

故障局限于对应播放器／设备；关闭时清理订阅、定时器和子进程。诊断包含有界原生代码和原因，不记录歌曲或协议正文。

## 验证

私有 D-Bus broker 验证加入／退出、属性、元数据先于封面及旧代次淘汰；内核测试在临时 video 文件上触发实际打开／关闭／热插拔。实机界面验收检查控制、共享快照与动画恢复，物理蓝牙／采集变化在对应硬件验证。

接口资料：[GSMTC](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssession)、[DeviceWatcher](https://learn.microsoft.com/en-us/windows/apps/develop/devices-sensors/enumerate-devices)、[注册表](https://learn.microsoft.com/en-us/windows/win32/api/winreg/nf-winreg-regnotifychangekeyvalue)、[MPRIS](https://specifications.freedesktop.org/mpris/latest/Player_Interface.html)、[BlueZ](https://bluez.readthedocs.io/en/latest/device-api/)、[PipeWire](https://docs.pipewire.org/page_man_pw-dump_1.html)、[inotify](https://man7.org/linux/man-pages/man7/inotify.7.html)。
