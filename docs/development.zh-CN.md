[English](development.md) · [架构](architecture.zh-CN.md)

# 开发

使用 [.node-version](../.node-version) 的 Node `22.23.3` 和 package.json 的 pnpm `12.9.1`，按提交的锁文件安装。原生打包在对应主机运行：Linux 使用 cc、dpkg、fakeroot、rpm，Windows MSI 使用 WiX，macOS 使用 Xcode 命令行工具。

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm check
pnpm test
pnpm package
pnpm make
```

Linux 开发需要有效 Chromium 沙盒。Electron 二进制旁存在 `chrome-sandbox` 时 Chromium 使用该文件，仅在其不存在时读取 `CHROME_DEVEL_SANDBOX`。helper 须为 root 所有且权限为 4755。当 `/usr/lib/ripple-next/chrome-sandbox` 满足该权限且与开发版二进制字节相同时，`pnpm start` 会移开开发版 helper 并选用它。需要其他匹配 helper 时设置 `CHROME_DEVEL_SANDBOX`。Forge 使用 X11／XWayland 运行透明窗口；修改主进程／preload 后重启应用。

## 命令与配置

| 命令                     | 用途                                              |
| ------------------------ | ------------------------------------------------- |
| `start`                  | Forge／Vite 开发及原生资源生成                    |
| `typecheck`              | 主进程、preload、界面、工具的严格 TypeScript 项目 |
| `lint`                   | Oxlint 正确性、Hooks 与分层边界，警告视为失败     |
| `format`／`format:check` | Prettier 写入／只读检查                           |
| `deadcode`               | Knip 入口、导出及依赖                             |
| `duplicates`             | JSCPD 生产源码重复分析                            |
| `check`                  | 全部只读静态检查                                  |
| `test`                   | 递归 Vitest `.test.ts`／`.test.tsx`               |
| `build:native`           | 对应主机的监听器／窗口模块构建                    |
| `package`／`make`        | 可运行目录／原生安装程序及归档                    |

[.config](../.config/README.zh-CN.md) 管理可移动工具配置。根清单、锁文件、pnpm-workspace.yaml 和编辑器／Git 发现文件保留在工具要求的位置。Vite 转译，独立编译器项目检查类型；共享层不依赖运行服务，界面不导入 Node、Electron 或主进程／preload。

## 配置、状态与原生集成

开发使用 `Ripple Next Development`，安装版本使用 Electron app-data 下的 `Ripple Next`；数据、缓存、凭据分别保存，原生锁维持一个实例。Linux 在 home 配置目录解析锁，再次启动打开设置。

SQLite schema 和预编译语句归 appStateStore，主进程校验唯一已提交快照并原子更新变化的行／列表，AI 图与关联加密凭据共享事务。读写失败保留数据，界面通过桥接初始化并提交类型化 patch。

Windows 媒体／设备使用常驻执行器；Linux 媒体／蓝牙使用内置 D-Bus 客户端，PipeWire 使用 `pw-dump --monitor --no-colors`，仅有 PulseAudio 时使用 `pactl subscribe`，V4L2 使用内置 inotify 程序并在事件后通过 `fuser` 读取。Forge 构建 Linux 程序与目标架构 macOS 窗口模块，作为原生资源分发。

## 验证与拍摄

测试按[平台、功能及公共契约](../tests/README.zh-CN.md)归类，可用 `pnpm test tests/platform/linux` 或 `pnpm test tests/features/media` 选择范围。内核测试跳过不支持的主机，私有 broker 和夹具隔离系统／播放器操作。

拍摄使用独立配置与演示内容，实际录制英文界面，中文表达演示使用对应语言，逐张／逐段检查。使用 pnpm capture 运行 scripts/capture 中维护的录制流程，先安装支持 VP9 编码的 FFmpeg 和 Playwright 录制工具，参见[脚本使用](../scripts/README.md)。原始录像与时间清单保存在忽略的 out/，原始字体、供应方算法和声明保持完整。

见[使用](../instructions.zh-CN.md)、[平台支持](platform-compatibility.zh-CN.md)、[原生监听](native-observation.zh-CN.md)、[诊断](diagnostics.zh-CN.md)和[发布](release.zh-CN.md)。
