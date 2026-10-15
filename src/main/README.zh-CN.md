[English](README.md) · [架构](../../docs/architecture.zh-CN.md)

# 主进程

主进程管理应用生命周期、窗口、托盘、系统效果与持久状态。`index.ts` 在界面初始化前建立应用配置目录、诊断、SQLite 和安全存储。原生锁维持单实例，再次启动打开设置；开发与安装版本使用独立数据和缓存目录。

`ipc.ts` 校验发送窗口与载荷，在偏好提交前应用系统效果，并广播已提交状态。设置负责编辑与凭据写入，Island 负责日常操作。`appStateStore.ts` 持有 SQLite schema、预编译语句和事务；读取失败直接报错，AI 图及相关凭据删除保持原子性。

## 领域服务

- 应用服务执行有序 LaunchTarget 数组并返回目标编号结果；平台适配器负责原生发现、准备和激活。
- 媒体服务管理自动／手动来源、串行控制、过期／错误快照和共享监听；控制及唤起携带当前会话 ID，不先执行元数据和封面工作。
- AI 配置管理稳定 ID 和绑定；请求解析模型提示词及注入，通过 SDK 执行 Chat Completions、Responses 或 Anthropic。取消和最终结果归属于请求。
- 天气服务管理查询组装、受保护凭据、并发合并及有界缓存。本地背景通过专用协议读取当前配置的资源。
- 选色服务管理设置窗口及原生 helper 生命周期。诊断管理有界可读日志、操作编号、原生错误代码与源码映射。许可服务读取指定的内置记录。

## 原生边界

Windows 常驻 MTA 执行器负责媒体／设备事件和控制；Linux 使用 D-Bus 信号、PipeWire／PulseAudio 流及内置 inotify 摄像头程序，属性先更新缓存元数据，本地封面由会话代次保护。macOS 管理播放器字典、应用激活及原生窗口行为。

Linux 仅修改 ShapeInput，首次显示等待输入区域确认；X11 客户端静态打包。原生发现与缓存归所属适配器，故障保持在对应设备或会话内。

见[原生监听](../../docs/native-observation.zh-CN.md)、[平台支持](../../docs/platform-compatibility.zh-CN.md)、[诊断](../../docs/diagnostics.zh-CN.md)和[开发指南](../../docs/development.zh-CN.md)。
