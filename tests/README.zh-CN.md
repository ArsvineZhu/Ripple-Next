[English](README.md) · [开发指南](../docs/development.zh-CN.md)

# 测试归属

| 目录                                                   | 职责                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `platform/linux`、`platform/macos`、`platform/windows` | 原生适配器、协议、命令及平台生命周期；文件名省略平台前缀。                             |
| `platform/*.test.ts`                                   | 涵盖多个系统的平台选择与原生集成。                                                     |
| `features/<feature>`                                   | AI、外观、剪贴板、Island、音乐、概览、搜索、设置及工作流的服务、hook、控件与用户交互。 |
| `shared`                                               | 公共运行时及可复用契约：生命周期、持久化、IPC、诊断、通知、语言、几何和公共控件。      |
| `shared/fixtures`                                      | React 容器与输入操作的共用夹具。                                                       |
| `platform/linux/fixtures`                              | 私有 D-Bus 协议 broker；测试不操作本机真实播放器。                                     |
| `features/appearance/fixtures`                         | 玻璃算法独立对照实现。                                                                 |

运行全量测试用 `pnpm test`；按归属运行可用 `pnpm test tests/platform/linux` 或 `pnpm test tests/features/media`。Vitest 递归发现 `.test.ts` 与 `.test.tsx`。DOM 测试在文件头指定 happy-dom；Linux 内核测试在其他系统跳过。inotify 测试用 `cc` 在临时目录编译监听器。

测试跟随它保护的契约归类，混合平台与功能职责的文件应拆开。重复资源初始化或独立对照实现可提取夹具，断言保持在各测试内。删除完全相同的重复用例，保留不同的并发、失败和生命周期回归。

可选媒体信号模块的 Node ESM 测试位于 `features/media-signals`，不在 Vitest 的 TS／TSX 发现范围内。运行 `node --test tests/features/media-signals/*.test.mjs`，覆盖合成 PCM、二进制帧分片与通用歌词边界。
