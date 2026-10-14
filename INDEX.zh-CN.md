[English](INDEX.md)

# 仓库地图

[功能与内部能力地图](docs/architecture.zh-CN.md) 跟踪完整使用路径、责任归属和当前全库整改。

- [文档目录](docs/INDEX.zh-CN.md)：开发、发布与使用说明。
- [主进程](src/main/README.zh-CN.md)：生命周期、托盘、窗口、IPC 和平台服务。
- [Preload](src/preload/README.zh-CN.md)：隔离的 renderer 桥接层。
- [Renderer](src/renderer/README.zh-CN.md)：Island 外壳、功能视图、hooks 和设置所有者。
- [共享契约](src/shared/README.zh-CN.md)：IPC/领域类型和输入区域几何计算。
- [工具配置](.config/README.zh-CN.md)：构建、分析和测试配置。
- [贡献规范](CONTRIBUTING.zh-CN.md)：开发流程及文档同步。

`src/assets` 保存字体和图标；`scripts` 保存开发启动器；`.config` 保存 Forge/Vite 和安装包模板。`.vite`、`out`、报告和依赖均是生成物，不纳入 Git。

产品入口：[简体中文](README.zh-CN.md)、[繁體中文](README.zh-TW.md)、[English](README.md)、[日本語](README.ja.md)。[发布说明](docs/releases/4.0.0.zh-CN.md)汇集 4.0.0 更新；[截图说明（英语）](docs/assets/screenshots/README.md)记录界面素材与更新方法。

[未发布的 4.1.0-beta.1](docs/releases/4.1.0-beta.1.zh-CN.md) 汇总当前 PR；[字体](src/assets/fonts/alibaba-puhuiti/README.md)与[指南录像](src/assets/guide/README.md)说明内置资源。
