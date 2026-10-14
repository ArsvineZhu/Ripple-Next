[English](release.md)

# 打包与发布验收

产品名为 **Ripple Next**，包名为 `ripple-next`，macOS bundle ID 为 `com.arsvinezhu.ripple-next`。使用[开发指南](development.zh-CN.md)规定的 Node／pnpm 工具链。

## 构建软件包

```sh
pnpm check
pnpm test
pnpm package
pnpm make
```

`package` 在 `out` 生成可运行的应用目录，`make` 在 `out/make` 生成安装包／归档。原生 maker 在对应主机执行：Linux 需要 DEB／RPM 工具，Windows MSI 需要 WiX，macOS 需要 Xcode Command Line Tools。具体依赖由开发指南维护。

| 构建目标         | 分发形式           |
| ---------------- | ------------------ |
| Linux x64        | DEB、RPM、便携 ZIP |
| Windows x64      | MSI、便携 ZIP      |
| macOS x64／arm64 | DMG、便携 ZIP      |

安装包与 Actions 构件使用 `RippleNext-<platform>` 命名，生成输出不纳入 Git。

## 准备与发布版本

1. 从已集成变更整理 `docs/releases/<version>.en.md` 与 `.zh-CN.md`，可参考 [4.0.0 说明](releases/4.0.0.zh-CN.md)。已发布说明保持与当时软件包对应。
2. 设置目标版本，核对依赖与锁文件，同步四语 README、截图和受影响指南。
3. 完成检查、测试，以及以下打包／运行验收。
4. 确定发布后推送 `v<version>`，标签必须与 `package.json` 一致。

指向 `main`／`master` 的 PR 在 Ubuntu、Windows、macOS 执行检查和测试；匹配的 `v*` 标签触发 Linux x64、Windows x64、macOS x64／arm64 打包，再创建 GitHub Release。`-beta.2` 等版本后缀生成预发布版。可以在匹配版本标签上手动触发工作流重试。

两个语言说明文件齐全时，CI 合并使用；两者均不存在时使用 GitHub 自动生成说明；只有一个文件时发布失败。beta.1／beta.2 双语说明列于[文档目录](INDEX.zh-CN.md)。下载入口指向 Ripple Next 发布列表或具体标签，GitHub Latest 可能仍指向旧版 Ripple。

## 运行验收

在可运行的软件包中检查以下行为；涉及删除数据／凭据的操作使用独立测试配置：

| 范围           | 验收内容                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 启动与窗口     | 托盘显示／隐藏／退出、登录启动、透明岛、工作区位置、岛外点击、正常退出                                                       |
| 模式与输入     | 悬停／点击、反复展开折叠、0–2000 ms 离开延迟、重新进入／菜单／焦点／拖动取消，以及移动／收缩后的几何重入                     |
| 导航           | 左右键、Ctrl 数字与可见顺序、横向连续手势最多一页、惯性尾部、反向操作、原生纵向滚动与位置保留                                |
| 个性化         | 四语界面与托盘、主题／背景解码失败、显示器、吸附／自由位置、页面排序／隐藏／默认、重启后的设置                               |
| 启动目标       | 已安装应用、独立 argv／cwd 命令、HTTP(S) 快捷应用、含失败目标的顺序工作流；`localhost:3000/` 带查询／片段在默认浏览器打开    |
| 音乐选择       | 自动 A／手动圆点、单播放器规则、稳定顺序、会话新增／退出、不同播放器同名歌曲、快速最新选择与控制会话 ID 对应                 |
| 音乐手势与封面 | 横纵归属、一段手势一张卡片、键盘焦点／Up／Down／Home／End、减少动态效果、展开与 QuickView 封面、失败恢复、Linux 无扩展名图片 |
| AI             | Base URL／模型／密钥、系统安全存储、流式 Markdown／代码复制、取消／重置、错误与密钥移除                                      |
| 日常工具       | 时钟／时区、天气／地点／单位、展开状态下的电池／设备提示、会话剪贴板读取／复制、任务添加／完成与持久化                       |
| 诊断           | 共用 session、失败／恢复、打开目录、日志轮转／转储保留，日志排除内容／密钥／端点                                             |

选择确认后，控制应恢复并对应选中的播放器；来源退出时移除圆点并恢复有效选择。Linux 无 `pactl` 时验证 PipeWire 采集开始与停止，连续轮询使用回退后端，无缺失命令刷屏。

## 各平台检查

Linux 在 renderer 就绪与 ShapeInput 查询确认前保持隐藏。检查视口边缘点击穿透和反复动画；保持 X11 静态打包、自启动中的 `--ozone-platform=x11`，桌面入口经 `gio launch` 启动。RPM 暂存保留 root 所有的 SUID sandbox helper。

Windows 检查原快捷方式参数／工作目录、Store Shell 激活、可执行文件失败反馈、GSMTC 封面／控制与自动隐藏任务栏边缘。macOS 检查自动化权限、运行中的 Spotify／Music、显示器／Dock 与登录项。可靠登录项要求签名／公证，当前打包使用 ad-hoc 签名。

分别记录打包、自动测试、原生运行观察，注明系统、架构与操作。硬件／媒体提示使用真实来源验证；演示截图展示界面，运行验收验证实际适配器。

## 更新时的数据

设置、任务、工作流、快捷应用和系统加密的 API-key 密文保存在用户数据目录的 `ripple-next.sqlite`。编号迁移位于 `src/main/database/migrations/`，运行 SQL 为 `.sql` 资源。验证升级后状态保留与密钥可用性，旧 Ripple 配置使用独立目录。Linux 仅修改当前 XDG 自启动目录中自己的 `ripple-next.desktop`。

原生集成和诊断细节见[平台支持](platform-compatibility.zh-CN.md)；更新宣传素材时参照[截图拍摄说明（英语）](assets/screenshots/README.md)。

## 4.1.0-beta.1 新增验收

当前分支尚未发布，[beta 说明](releases/4.1.0-beta.1.zh-CN.md)记录范围。检查字体在设置与 Island 中同步、重启后保留、原始 WOFF2 加载，以及简体中文的三种表达与日期／数字格式。检查键位优先指南、四段视频解码、离开可视区或分类时暂停、一次只播放一个。检查玻璃默认值与预览、关闭后的普通控件、按住拖动开关、滑杆吸附与圆头填充、确认框进入／退出、关于 hero 与禁用图片拖拽。原生 macOS／Linux 验收单独记录。
