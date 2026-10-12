[English](platform-compatibility.md)

# 平台支持与排障

Ripple Next 在 Windows、macOS、Linux 上共用界面和数据格式，通过各平台适配器接入媒体、已安装应用、设备和登录启动服务。

## 原生功能对照

| 功能           | Windows                              | macOS                                                 | Linux                                                  |
| -------------- | ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------ |
| 音乐           | GSMTC 会话、控制能力与封面           | AppleScript 读取运行中的 Spotify、Music；Spotify 封面 | 会话 D-Bus 上的 MPRIS、控制能力与封面                  |
| 唤起播放器     | 缓存的应用标识／路径                 | 激活正在运行的应用                                    | 支持时使用 MPRIS Raise                                 |
| 已安装快捷应用 | 开始菜单 `.lnk` 与 Store 标识        | 系统、共享、用户 Applications，含 Utilities           | XDG 桌面条目，经 `gio launch` 启动                     |
| 登录启动       | 系统登录设置                         | 打包应用的原生登录项                                  | 当前 XDG 自启动目录中的 `ripple-next.desktop`          |
| 透明窗口输入   | 按原生光标／岛边界切换穿透           | Electron 岛外点击穿透                                 | XWayland 上的 X11 `ShapeInput`                         |
| 设备状态       | WinRT 蓝牙；摄像头／麦克风注册表探测 | 蓝牙与采集设备注册表探测                              | `bluetoothctl`、`fuser`、`pactl` 或 PipeWire `pw-dump` |

播放器发布受支持的媒体会话后才会出现；控制可用性由其能力决定。macOS 当前接入 Spotify／Music，Music 适配器读取元数据和控制，但尚未读取封面。摄像头／麦克风提示依据系统和驱动提供的探测信息。

## 封面与多播放器

Linux 从 `mpris:artUrl` 获取封面，本地读取上限为 5 MiB。保留已有扩展名格式支持；扩展名无法识别时，根据 PNG／JPEG／GIF／WebP 文件签名决定 data URL 的 MIME。文件缺失、过大或无法读取时，歌曲和控制仍保持可用。图片解码失败显示音乐占位图，切换会话或封面 URL 后重试。

Windows 通过共用的类型化 CLR 桥接读取 GSMTC 元数据、封面和控制，将 WinRT `IAsyncOperation<T>` 经 `AsTask` 转换后等待。macOS 分别查询运行中的 Spotify／Music 字典，避免请求查找未安装的播放器。

媒体服务负责选择：自动模式优先活动播放器并保留合适会话；手动选择在本次运行中保持，直到会话消失。Linux 会话标识包含唯一 D-Bus owner，因此重新启动的播放器是新会话。播放命令携带当前卡片的会话 ID，旧会话关闭后不会把旧命令转交其他播放器。

音乐页以 A 加稳定排序的圆点表示来源。连续纵向手势最多换一张卡片，横向手势切换功能页。选择请求串行执行，快速输入保留最新目标。键盘操作与单播放器行为见[使用指南](../instructions.zh-CN.md)。

## Linux 配置与恢复

透明窗口使用 X11／XWayland，占据所选显示器的工作区；只有 `ShapeInput` 随 Island 动画变化。保持 X11 客户端静态打包，自启动入口保留 `--ozone-platform=x11`。用 `ShapeBounding` 做动画会导致黑色闪烁。启动先等待 renderer 就绪并确认首次输入区域，再显示窗口。

Snap 播放器可通过 AppArmor 限制 MPRIS 访问。从 IDE 或编程工具启动的 Ripple 可能继承其 AppArmor 标签，使 Snap Spotify 等播放器拒绝读取，而其他播放器仍然可见。D-Bus 报告 `AccessDenied` 并指出发送方 AppArmor 标签时，从桌面入口或正常用户会话启动 Ripple，再检查该播放器。

| 现象                            | 检查或处理                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 旧构建报告 `spawn pactl ENOENT` | 使用更新构建。当前代码在 `pactl` 缺失时改用 `pw-dump --no-colors`；PipeWire 系统若两个命令都没有，安装发行版提供 `pw-dump` 的工具包。 |
| 麦克风状态不可用                | 确认音频后端能连接当前用户会话。PipeWire 检测运行中的 `Stream/Input/Audio` 节点；后端选择保持到 Ripple 重启。                         |
| 蓝牙／摄像头探测失败            | 检查 `bluetoothctl`／`fuser` 是否存在，以及相应设备的访问权限；连接和权限错误可在诊断中查看。                                         |
| 已安装应用无法启动              | 检查桌面条目与 `gio launch`；移动或移除应用后重新选择入口。                                                                           |
| 无法保存 AI 密钥                | 解锁／配置系统凭据服务并重启 Ripple；Linux 拒绝使用明文加密后端。                                                                     |
| 开发时 sandbox 报错             | 使用版本匹配、root 所有且权限为 `4755` 的 Chromium sandbox helper，见[开发指南](development.zh-CN.md)。                               |
| 岛外点击被拦截                  | 检查 XWayland 与诊断中的首次 ShapeInput 确认；修改主进程／preload 输入代码后重启。                                                    |

自定义命令由可执行文件和独立 argv 启动。工作流中的 `localhost:3000/` 在文件路径判断之前识别为 URL，交给默认浏览器；浏览器已打开但页面失败时，检查浏览器关联和端口 3000 上的服务。

## Windows 与 macOS

Windows 保留原 `.lnk` 启动，延续快捷方式参数和工作目录。Store 目标通过 PowerShell `Start-Process` 原生 Shell 激活；可执行文件等待 spawn 事件。应用发现共享并发重建操作，缓存原子写入。启动反馈显示在被点击的快捷应用或工作流旁。

Windows 按 DIP 比较光标和 Island 边界，拖动时保留输入捕获，岛外释放。窗口位于工作区内，并为自动隐藏边缘和分数缩放额外留出 2 DIP。首次显示不激活窗口，明确请求焦点时才激活；关闭时统一清理输入监听和轮询。Windows 保持其他应用获得焦点时的可见动画；macOS／Linux 保留隐藏窗口节流。

macOS 发现应用程序包时不遍历包内部；AppleScript 媒体控制可能需要自动化权限。登录项注册检查原生结果，可靠注册要求已打包、签名并公证的应用。当前打包使用 ad-hoc 签名，开发构建会提示登录项注册不可用。

切换开发系统后从锁文件重新安装依赖。已安装应用的标识依赖平台，迁移配置后重新选择这些快捷应用；系统加密的 API 密钥也可能需要重新填写。

## 手势与反馈

较长面板使用原生纵向滚动。连续横向输入最多前进一个循环相邻页，保留稳定页面标识、连续动画、模糊和尺寸插值，额外位移产生有界弹性。允许少量横向手势漂移；明显的纵向输入由内容持有。

主进程合并 Chromium `gestureScrollBegin`／`gestureFlingCancel` 后，以仅含时间戳的事件传给 preload。没有原生边界的设备使用 150 ms 静默间隔，以及持续衰减尾部／重新上升输入规则。主进程和 preload 的修改需要重启应用才能验证。

启动、媒体、设置和剪贴板复制错误显示在对应功能旁。电池／设备提醒保留用户已展开的页面。分钟时钟按分钟边界更新，原生滚动避免持续动画循环；剪贴板与设备轮询在岛折叠后继续运行。

## 本地诊断

进入**设置 → 诊断 → 打开诊断文件夹**。位置为 `<userData>/diagnostics/`，Windows 通常是 `%APPDATA%\Ripple Next\diagnostics`。

主进程与 renderer 共享 session ID。记录包括运行版本、显示器缩放、原生后端与安全存储可用性、窗口／进程生命周期、睡眠恢复、显示器变化、GPU 状态，以及 IPC 通道、结果和耗时。健康轮询记录首次结果；重复相同失败计数，每分钟最多记一次，恢复后另记。

错误保留堆栈、代码、信号和有限层级的原因；Windows 原生错误可包含 HRESULT。AI 记录请求 ID、时间、分片数量与回答长度。命令和输出、IPC 参数和结果、应用目标、端点 URL、密钥、剪贴板、提问和回答均排除在日志之外。主日志达到 5 MiB 时轮转。

崩溃转储不上传。启动时跨 Crashpad 子目录清理超过 30 天的转储，只保留最新 10 个 `.dmp`，保留元数据。Minidump 包含进程快照，分享前检查。反馈问题时请提供版本、系统／桌面、失败操作、复现步骤和经过检查的相关日志。

## 验证记录

CI 在 Ubuntu、Windows、macOS 上执行静态检查和测试；发布打包覆盖 Linux x64、Windows x64、macOS x64／arm64。打包验证构建集成，各主机原生行为按[发布验收](release.zh-CN.md)逐项检查。

2026 年 10 月的 Linux 更新完成完整检查、测试、Linux 打包，并验证无扩展名封面、默认浏览器的实际工作流启动，以及 PipeWire 采集活动回到空闲。宣传截图取自真实 Linux renderer 的独立演示配置。此前 Windows 适配验证过原生 Shell／WinRT，以及打包应用的启动和剪贴板；新 Windows／macOS 版本继续在对应主机执行验收。

## 协议与 API 参考

- [MPRIS 元数据与封面](https://specifications.freedesktop.org/mpris/latest/Track_List_Interface.html#Mapping:Metadata_Map)
- [Microsoft ShellExecuteEx](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shellexecuteexa)
- [PowerShell Start-Process](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process)
- [WinRT AsTask](https://learn.microsoft.com/en-us/dotnet/api/system.windowsruntimesystemextensions.astask)
- [蓝牙连接选择器](https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.bluetoothdevice.getdeviceselectorfromconnectionstatus)
- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- [Electron app、GPU 与登录项](https://www.electronjs.org/docs/latest/api/app)
