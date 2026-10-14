[English](README.md)

# Shared 契约

`launch.ts` 统一应用发现、快捷应用与工作流使用的 `Application`／`LaunchTarget`。工作流保存 `targets`，目标类型在编辑时确定。已安装应用的 `native` 保存不透明平台标识，命令保留独立 argv 和可选工作目录。`launch-targets` 一次提交选定的目标数组，返回带序号的失败；平台适配器解释并激活原生标识。

`MediaSnapshot` 描述会话列表、自动／手动选择、时效和错误；`MediaSession` 包含播放状态及允许未知值的控制能力。`media.ts` 定义正式会话／快照／操作类型及纯选择和能力规则。控制 IPC 必须携带会话 ID；选择更新主进程现有快照，控制返回刷新后的快照与领域错误。

`pages.ts` 管理稳定页面 ID、默认排序和内置页面尺寸策略。持久化页面 ID 使用字符串；状态 schema 接受新增的命名页面，页面身份与导航位置分别管理。

`backgroundImage.ts` 规范背景设置，将本地路径编码为专用图片 URL，避免 CSS 反斜杠转义；它不执行文件访问。

Shared 定义可序列化的 IPC 与领域契约、用于持久化状态和快捷应用目标的 Zod schema，以及纯输入区域计算。Main、preload 和 renderer 共用这些定义，运行时服务放在各自所属层。

`contracts.ts` 定义请求、响应、通知及 AI 流事件，`appState.ts` 定义初始值、结构化 AI 配置、统一天气配置。`aiConfiguration.ts` 校验稳定 ID、接口／密钥／模型引用、自定义补丁与有序注入，上下文感知固定关闭。`weather.ts` 区分天气、探测地址和有界错误，`licenses.ts` 描述许可元数据与文本。运行服务留在所属层；`i18n/` 为 main 和 renderer 提供完整内置词条。

参见[开发指南](../../docs/development.zh-CN.md)和[仓库地图](../../INDEX.zh-CN.md)。

`diagnostics.ts` 定义安全错误字段，以及 IPC、平台能力和生命周期事件。原生剪贴板读写是明确的 IPC 契约，诊断不记录文本内容。

`ScrollGestureStartSchema` 校验原生触控板边界的时间戳载荷；main 产生事件，preload 校验并转发，renderer 据此区分新手势与旧惯性。

`color.ts` 解析保存的 RGB／hex CSS 颜色，在应用原生 RGB 选色时保留透明度。`show-color-picker` 返回 hex 或 null，`colorPickerFailed` 的反馈属于设置窗口。

`fonts.ts` 校验 uiFont；i18n 保存原创趣味中文覆盖表，localeForFormatting 在 Intl 前将内部／私有语言映射为标准语言。字体与玻璃默认值应用于新设置，保留已有用户选择。

diagnosticError.ts 管理应用编写的 DiagnosticError 原因、字段约束及安全的系统／HTTP 分类；diagnosticFormat.ts 管理可读格式与级别策略；RendererDiagnosticSchema 限制正式 preload 上报，不包含自由正文。见[诊断说明](../../docs/diagnostics.zh-CN.md)。
