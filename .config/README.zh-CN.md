[English](README.md) · 英文为规范来源。

# 工具配置

Forge/Vite/Vitest、分环境 TypeScript 项目、Oxlint、Knip、Prettier、JSCPD 配置集中在这里，由 package scripts 显式选择。`templates` 保存 Linux desktop/RPM 模板，`entitlements.plist` 定义 macOS 签名权限。

根目录 `tsconfig.json` 是编辑器项目入口，编译选项和分环境项目放在本目录。Git/编辑器自动发现文件、`.node-version`、manifest 和 lockfile 保留在根目录。pnpm 要求项目设置位于根目录 `pnpm-workspace.yaml`；Electron Forge 要求使用 hoisted 链接模式，获准的安装脚本在 `allowBuilds` 中声明。`.github/workflows` 保持 GitHub 规定的位置。

pnpm 任务和分析工具使用的项目路径相对于仓库根目录；TS 的 `include`/`extends`、schema 与 ignore 文件路径相对于配置文件。Forge 从 `projectRoot` 解析资源，避免配置目录迁移改变构建路径。

参见 [开发指南](../docs/development.zh-CN.md) 和 [仓库地图](../INDEX.zh-CN.md)。

Windows MSI 已显式指定随仓库提供的 `.ico`，安装程序指向打包出的 `ripple-next.exe`（即 `executableName`），快捷方式 AppUserModelID 为 `com.arsvinezhu.ripple-next`。`allowBuilds` 禁用未使用的原生 EXE 图标提取器，安装包直接使用提供的图标。

Forge 将 src/assets/third-party/liquid-glass-notices.txt 作为额外资源分发。锁定的玻璃 vendor 源码保留原始格式，不参与 lint、format、Knip 和重复代码报告；类型检查仍包含这些文件。

主进程、preload 与 renderer 构建保留 sourcemap 和可读生成代码；主进程诊断只解析 .vite 内相邻 map，最多缓存 16 份。map 随构建分发，不纳入 Git。

Forge generateAssets 在打包前按目标架构构建原生资源。与 package.json 一致的版本标签触发平台验证、打包和发布，见[发布流程](../docs/release.zh-CN.md)；原生资源位于 ASAR 外。
