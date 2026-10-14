[English](README.md)

# 主进程

`services/apps.ts` 只负责按序执行目标和逐项返回结果，不分支判断平台。`platform/apps.ts` 选择原生应用能力：Linux 管理 desktop entry 与 gio，macOS 管理应用包与 open，Windows 管理快捷方式、Store 激活和五分钟共享内存发现缓存。发现按需开始，不再提前 build-cache、写读 installed-apps JSON、由 renderer 循环启动或固定等待。

`services/media.ts` 管理媒体会话选择、串行查询／控制及过期／错误快照。自动模式优先正在播放的系统会话，再保持仍在播放或暂停的选择；手动选择在本次运行中保持到会话退出。命令携带界面显示的会话 ID，不回退到其他播放器。Windows 读取 GSMTC 能力并通过缓存的类型化 CLR 桥接读取封面；macOS 分别查询正在运行的 Spotify／Music；Linux 使用随应用打包的 D-Bus 客户端，以 MPRIS 唯一总线名读取能力、控制及本地封面。点击封面通过会话专属接口唤起播放器：Windows 使用主进程缓存的实际启动路径／应用标识，macOS 打开正在运行的对应应用，Linux 优先调用 MPRIS Raise；CanRaise 为 false 或 Raise 失败时，调用同一会话所有者的 StatusNotifierItem Activate，不启动应用进程，也不再同步等待媒体查询。未接入云端音乐 API。
MPRIS 本地封面文件没有可识别的图片扩展名时，按 PNG／JPEG／GIF／WebP 文件特征识别并转换为 data URL，仍限制在 5 MiB 以内。封面缺失或不支持不影响媒体会话。

`services/backgroundImage.ts` 通过 `ripple-background:` 加载当前配置的本地背景，开发与打包版本共用此入口。支持绝对路径及文件 URL，使用 `pathToFileURL` 编码文件名，只允许读取当前配置的图片。网络图片仍由 renderer 直接加载。

Main 管理应用生命周期、托盘、透明窗口、IPC 校验和系统能力。`index.ts` 设置 Ripple Next 专用用户数据目录，并在创建 renderer 窗口前载入类型化状态和安全凭据服务。

`appProfile.ts` 为打包版选择 `Ripple Next`，为开发版选择 `Ripple Next Development`。配置与 Chromium 缓存独立，原生单实例锁在正式版配置目录中获取，再恢复当前版本的配置路径。Linux 从用户主目录确定锁位置，使用其他 `XDG_CONFIG_HOME` 数据目录时也共用该锁。首次启动、再次启动和应用激活都会打开同一个设置窗口；关闭设置后 Island 继续运行。

服务负责原子状态存储、加密 API key、应用内通知、AI 请求、应用发现与启动、开机启动；平台适配器封装 Linux、macOS 和 Windows 差异。`ipc.ts` 校验发送方和 payload，共享类型见[shared 说明](../shared/README.zh-CN.md)。

`appStateStore.ts` 管理当前 SQLite schema、预编译语句和主进程唯一快照，只提交变动的设置行或功能列表，事务成功后发布新快照。相关密钥删除在同一事务中。读取失败直接抛出并显示启动错误；默认值和失败写入不会覆盖原数据。历史迁移链与版本分发已删除。

`services/colorPicker.ts` 管理原生 RGB 对话框及进程生命周期。IPC 只允许设置窗口调用，校验 RGB hex 并关联窗口；关闭窗口时终止进程，取消返回 null，正常选色不设超时。Windows 使用关联窗口的 `ColorDialog`，macOS 使用 `choose color`，Linux 按桌面选择 kdialog／zenity。依赖见[平台说明](../../docs/platform-compatibility.zh-CN.md#原生功能对照)。

随应用打包的系统提示词位于 `ai/default-assistant.md`。每次 AI 请求前，由 `ai/prompts.ts` 解析 `{{product}}`、`{{developer}}`、`{{version}}`、`{{license}}`、`{{repository}}`、`{{issues}}`、`{{timezone}}` 和 `{{current_time}}`。静态信息来自 `package.json`，`{{version}}` 使用 Electron 的 `app.getVersion()`。时间信息遵循应用设置的时区；选择“跟随系统”时使用操作系统时区，`{{current_time}}` 格式为 `YYYY-MM-DD HH:mm:ss`。未知变量保持原文，用户输入不会经过模板替换。

Linux 窗口需等 renderer 就绪并确认首个 X11 `ShapeInput` 区域后显示。X11 客户端保持静态打包；输入区域继续使用 `ShapeInput`。

参见[开发指南](../../docs/development.zh-CN.md)和[仓库地图](../../INDEX.zh-CN.md)。

`services/scrollGestures.ts` 将 Chromium 的新触控板手势边界（`gestureScrollBegin`／`gestureFlingCancel`，成对信号去重）转发到 preload，只携带时间戳。监听器保留 WebContents 引用，在销毁和窗口关闭时清理，不转发按键内容、鼠标坐标或滚轮数据。

平台命令通过 `services/processes.ts` 执行，具有超时和真实的异步失败结果；Windows 使用编码的 PowerShell 脚本与共享 WinRT 异步转换。IPC 诊断记录操作结果、耗时和安全错误字段，启动反馈由 renderer 的操作项显示。剪贴板文本读写通过校验后的原生桥接执行。检查结果见 [Windows 适配与诊断](../../docs/platform-compatibility.zh-CN.md)。

`platform/linux/devices.ts` 先使用 `pactl` 检测采集；命令缺失时切换 `pw-dump`，后端保持到应用重启。PipeWire 以运行中的 `Stream/Input/Audio` 节点判断采集活动，连接／命令错误交给诊断。

`ai/configuration.ts` 串行修改配置图并分配稳定序号，凭据密文保存在命名安全存储项中，删除配置与关联密钥在同一 SQLite 事务提交。`ai/stream.ts` 选择 Chat Completions、Responses 或 Anthropic 适配器，解析所选模型的系统提示词和已启用有序注入；本地上下文上限在发送前按字符检查。`services/weather.ts` 管理内置／自定义密钥、请求去重和有界 60 秒缓存。`services/licenses.ts` 加载随包许可元数据，仅读取已知许可条目。

新增接口与密钥的可编辑名称初始为空；renderer 用协议／密钥名称及当前顺序生成显示名称。主进程 ID 始终递增，显示编号不复用或重排数据库 ID。
偏好补丁在保存及广播前执行显示器／登录项操作，Island 创建时直接恢复保存的显示器。自启动适配归 platform/autostart 及三平台实现，Windows／macOS 拒绝开发构建注册并检查系统接受结果。天气接收 WeatherPreferences，仅在请求时生成服务查询。

AI 配置、执行、协议流和提示词集中在 `ai/`。配置服务每次请求只解析一次当前模型和加密凭据；`ai/assistant.ts` 负责取消并返回一个完成／取消／错误结果，IPC 只向发起请求的 renderer 发送文本增量。`ai/stream.ts` 消费 SDK 文本流并直接使用其最终文本。流中途失败时保留已显示的回答并同时展示错误；重置会取消网络请求并忽略迟到输出。

设备检测通过 `platform/devices.ts` 选择原生实现，各系统适配器拥有查询与缓存。`services/colorPicker.ts` 只管理对话框生命周期与所属窗口状态；`platform/colorPicker.ts` 校验和统一 RGB 结果，具体系统命令归各自适配器。Windows 使用支持取消的统一 PowerShell 入口。数据库初始化失败时，退出前显示本地化原生错误与数据位置，不重置数据库。
