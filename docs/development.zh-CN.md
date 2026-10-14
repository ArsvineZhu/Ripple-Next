[English](development.md)

# 开发指南

使用 [.node-version](../.node-version) 中的 Node `22.23.3`，并使用 `package.json` 固定的 pnpm `12.9.1`。当前工具链要求 Node 22.13 或更新版本。Linux 打包需要 `dpkg`、`fakeroot`、`rpm` 和构建工具；可选系统功能使用 `bluetoothctl` 与 `fuser`。麦克风检测使用 `pactl`；缺少此工具时，在 PipeWire 系统上切换到 `pw-dump`，读取正在运行的音频采集流。选中的检测后端保持到应用重启，命令或连接失败仍记录为诊断错误。Windows MSI 需要 WiX Toolset，macOS 打包需要 Xcode Command Line Tools。在对应系统运行原生 maker。

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm check
pnpm test
pnpm package
pnpm make
```

Linux 开发时可能需要与 Electron 构建匹配、root 所有且权限为 `4755` 的 Chromium sandbox helper。如果安装了相同构建的 Ripple Next，可在启动 Forge 时设置 `CHROME_DEVEL_SANDBOX=/usr/lib/ripple-next/chrome-sandbox`。

## 工具职责

`pnpm start` 使用 Electron 应用数据目录下的 `Ripple Next Development`，打包版继续使用 `Ripple Next`。开发版的数据、Chromium 缓存和凭据独立，但两个版本共用 Electron 原生单实例锁。启动任意版本都会打开当前实例的设置窗口，同时只运行一个实例。锁使用正式版配置目录；Linux 从用户主目录确定锁位置，不同 `XDG_CONFIG_HOME` 配置也共用该锁。

工具配置集中在 [.config](../.config/README.zh-CN.md)，由 package scripts 显式选择。

| 命令                      | 契约                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `typecheck`               | 严格检查 main/preload/renderer/工具 TS 项目，Vite 仅转译                                       |
| `lint`                    | Oxlint 检查 TS/React/Hooks 正确性和导入边界，warning 使 CI 失败                                |
| `format` / `format:check` | Prettier 写入/检查配置的 2 空格、LF、单引号及 100 列风格                                       |
| `deadcode`                | Knip 检查入口、导出和依赖；Forge 构造器显式引用动态 makers/plugins                             |
| `duplicates`              | JSCPD 按项目阈值扫描生产 TS/TSX                                                                |
| `check`                   | 聚合上述只读静态检查                                                                           |
| `test`                    | Vitest 覆盖状态持久化、安全密钥存储、IPC、AI 流式响应、交互状态、国际化、平台命令及 Linux 几何 |

Oxlint 关闭 `react/set-state-in-effect`，因为 OS 遥测和偏好 effect 会有意驱动状态。Renderer 不导入 Node、Electron 或 main/preload；shared 不依赖运行时服务。类型检查以 TypeScript 为准。

## 运行架构

Main 拥有应用生命周期、托盘、透明窗口、系统能力和 typed IPC。服务拥有状态持久化、安全凭据、通知、AI 请求、应用发现/启动和自动启动；平台适配器封装系统差异。Preload 暴露 typed `electronAPI`，shared Zod schema 验证状态文件和启动目标。Renderer 拥有视图和交互；XState 管理鼠标离开、几何重入、焦点、菜单与拖动状态。

状态服务使用新用户数据目录中的 `ripple-next.sqlite` 保存设置、任务、工作流、快捷应用和已加密的 API key。编号 schema migration 位于 `src/main/database/migrations/`，命名查询位于 `src/main/database/queries/`，全部使用 `.sql` 文件；TypeScript 只绑定参数并控制事务。Renderer 在显示界面前读取状态快照，再通过 typed patch 更新；设置和功能数据不使用 `localStorage`。API key 使用 Electron `safeStorage` 加密，且不会返回 renderer。Linux 缺少 OS 密钥存储时拒绝保存密钥。Ripple Next 不读取或迁移旧 Ripple 数据目录。Linux 自启动优先使用绝对路径 `XDG_CONFIG_HOME/autostart`，否则使用 `~/.config/autostart`。

AI SDK 的 `streamText` 为 Chat Completions 使用现有 OpenAI 兼容适配器，并按所选带序号接口选择 OpenAI Responses 或 Anthropic 适配器。`aiConfiguration.ts` 管理配置图，密文使用 `ai-api-key:<id>` 命名记录；main 串行修改、保留模型自定义，并原子删除关联密钥。Migration 4／5 保留原配置和密文。普通配置自动保存，凭据替换需明确提交；上下文上限按字符计数，上下文感知仍关闭。内置系统提示词保留在 `src/main/prompts/default-assistant.md`；`xstate`、`@xstate/react` 管理可取消交互延迟，自定义应用命令通过 `spawn` 参数数组执行。

浏览器搜索地址模板保存在设置中，必须包含 `{query}`；直接输入 HTTP(S) 地址仍会作为网址打开。时钟和日期使用当前语言，并可跟随系统时区或指定 IANA 时区。错误会路由到所属功能区行内展示；`InlineNotices` 沿用 Island 的 Motion 淡入与模糊过渡。长内容区使用系统原生纵向滚动，横向页签使用可接续的连续动画与有界回弹；AI 回答会随内容增长，并限制在当前屏幕可用高度内。设置页滑块由对应 CSS Module 统一管理主题轨道、滑块和焦点样式。

## 页面注册

页面使用 `overview`、`tasks` 等稳定字符串标识，位置由保存的排序决定。`src/shared/pages.ts` 管理内置页面元信息，以及固定或依内容计算的尺寸策略；`src/renderer/lib/tabs.tsx` 将它们与图标、渲染函数组合。创建 Island 页面注册表时可添加新定义，提供 ID、标题、图标、渲染函数及尺寸策略。可用条件、圆角、对齐和阻止折叠能力可按需设置。导航与动画从注册表读取页面。SQLite migration 3 转换已有数字 ID，保留页面排序及功能数据。

## 本地诊断

平台适配检查结果、诊断字段和平台验收边界见 [Windows 适配与诊断](platform-compatibility.zh-CN.md)。CI 在 Ubuntu、Windows 和 macOS 上执行检查与测试；更换系统时，从锁文件重新安装依赖。

Ripple Next 将 `ripple-next.log` 写入 `<userData>/diagnostics/`，Electron minidump 保存在其中的 `crashes/` 子目录。可在设置页的“诊断”区域选择“打开诊断文件夹”。日志传输大小上限为 5 MiB；每次启动时会清理超过 30 天的崩溃报告，并只保留最新的 10 份。

崩溃报告不会上传。AI 日志记录请求 ID、阶段耗时、增量数量和回答字符数，不记录提示词或回答正文。错误记录包含错误类型和堆栈帧，不包含自由格式的错误消息。minidump 是二进制进程快照，应作为敏感的本机诊断数据处理。

Linux 使用透明 XWayland 窗口，并限制在所选显示器的工作区内，以保留桌面面板。仅让 X11 `ShapeInput` 跟随动画中的 Island；修改 `ShapeBounding` 可能出现黑边。X11 客户端保持静态导入并打入安装包。Island 始终通过同一 X11 客户端请求 `_NET_WM_STATE_SKIP_TASKBAR`。设置窗口是独立的普通 BrowserWindow。Island 需等 renderer ready 且首次输入区域得到确认后才显示。边界说明见[主进程](../src/main/README.zh-CN.md)、[preload](../src/preload/README.zh-CN.md)和[renderer](../src/renderer/README.zh-CN.md)。

Forge 在启动和打包前清理 `.vite`；`.vite`、`out`、报告和 `node_modules` 不纳入 Git。各类读者的说明见[文档目录](INDEX.zh-CN.md)。

## 正式版工作

`pnpm package` 生成可运行目录，`pnpm make` 同时执行配置的原生安装包／归档 maker。[发布指南](release.zh-CN.md)维护版本／标签流程和运行验收。修改主进程或 preload 后重启整个应用，renderer 热更新只替换界面代码。截图数据与会改变状态的运行验证使用独立配置。

[四语产品 README](INDEX.zh-CN.md)介绍功能，本指南维护工具链命令。行为变化时同步双语技术指南与界面截图；演示数据规则见[拍摄说明（英语）](assets/screenshots/README.md)。

## 设置资源

`pnpm package` 执行 `scripts/collect-licenses.mjs`，将已安装依赖及锁定玻璃源码的许可收集到 `src/assets/third-party/licenses.json`，把 Chromium 许可 HTML 复制到生成目录 `out/license-assets`，Forge 将两者放入资源包。设置先读取元数据，选择条目时再读取文本；依赖变化后重新生成。生成输出与运行报告不入 Git。

天气请求及凭据留在 main。有界缓存按位置、单位和凭据区分结果，并复用并发请求；更换密钥后使用新的缓存身份。Renderer 在进入、聚焦和每分钟刷新自动定位预览。操作见[使用指南](../instructions.zh-CN.md)，材质与测量见[设置玻璃](../src/renderer/components/liquidGlass/README.zh-CN.md)。

## 字体与指南素材

共享 fonts.ts 校验 uiFont，AppStateProvider 在每个 renderer 应用字体。原始 WOFF2 与许可见[字体资源](../src/assets/fonts/alibaba-puhuiti/README.md)，不要转换或裁剪。主进程／托盘使用 zh-ms／zh-apple，i18next 使用合法私有 BCP 47 标识，Intl 使用 zh-CN。覆盖表继承未改动的标准中文键。

[指南录像来源](../src/assets/guide/README.md)记录场景与更新方法。在独立演示配置录制真实动作，运镜可裁切／缩放已有画面，不要制作虚假的 UI 帧。同步更新封面、本地化步骤与截图画廊。
