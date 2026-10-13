[English](README.md) · 英文为规范来源。

# 工具配置

Forge/Vite/Vitest、分环境 TypeScript 项目、Oxlint、Knip、Prettier、JSCPD 配置集中在这里，由 package scripts 显式选择。`templates` 保存 Linux desktop/RPM 模板，`entitlements.plist` 定义 macOS 签名权限。

根目录 `tsconfig.json` 是编辑器项目入口，编译选项和分环境项目放在本目录。Git/编辑器自动发现文件、`.node-version`、manifest 和 lockfile 保留在根目录。pnpm 要求项目设置位于根目录 `pnpm-workspace.yaml`；Electron Forge 要求使用 hoisted 链接模式，获准的安装脚本在 `allowBuilds` 中声明。`.github/workflows` 保持 GitHub 规定的位置。

pnpm 任务和分析工具使用的项目路径相对于仓库根目录；TS 的 `include`/`extends`、schema 与 ignore 文件路径相对于配置文件。Forge 从 `projectRoot` 解析资源，避免配置目录迁移改变构建路径。

参见 [开发指南](../docs/development.zh-CN.md) 和 [仓库地图](../INDEX.zh-CN.md)。

Windows MSI 已显式指定随仓库提供的 `.ico`，`allowBuilds` 因此禁用未使用的原生 EXE 图标提取器。该可选 addon 在 Windows 上用指定 Node 版本编译失败；显式图标使安装包创建无需调用它。

Forge 将 src/assets/third-party/liquid-glass-notices.txt 作为额外资源分发。锁定的玻璃 vendor 源码保留原始格式，不参与 lint、format、Knip 和重复代码报告；类型检查仍包含这些文件。
