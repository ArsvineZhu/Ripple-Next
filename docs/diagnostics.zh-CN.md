[English](diagnostics.md) · [开发说明](development.zh-CN.md)

# 排查 Ripple Next 问题

在设置 → 关于 → 诊断中点击“打开诊断文件夹”。`<userData>/diagnostics/` 下的 `ripple-next.log` 是可直接阅读的文本日志，单个文件在 5 MiB 时轮转。Electron 崩溃转储保存在 `crashes/`，只保留 30 天内最新的 10 份，不自动上传。

## 阅读错误

每条记录标明 UTC 时间、级别、组件／窗口及本次运行的会话编号。IPC 操作拥有编号，开始、结束及内部原生／AI 失败使用同一个操作编号。设置校验失败会说明字段及约束：

```text
2026-10-14 11:05:52.556 UTC ERROR [main/settings] [session 1c43dc57] #21 update-app-state failed (11 ms)
  DiagnosticError: Invalid app state update
  settings.theme: expected default | sleek-black | win95
      at src/main/ipc.ts:...
  Settings category=appearance; page=category root
```

从首次失败及原因链开始排查。`ENOENT` 表示找不到文件或可执行程序，`EACCES` 表示拒绝访问；HTTP 401／403 表示认证被拒绝，429 表示限流，5xx 表示服务故障。已知 Windows HRESULT 会附带可读原因。校验记录包含字段路径、类型及可选值，不包含提交的值。AI、启动、天气或媒体返回业务失败时，即使 IPC 正常返回，也会记录为失败。

设置错误附带当前分类／编辑页；Island 错误附带当前页面、模式、视口、实测区域和回答字符数。两种窗口分别保存崩溃上下文，设置窗口不会使用 Island 的上下文。React 错误可附带组件树。随构建分发的 sourcemap 将主进程与渲染层栈帧映射到原始源码位置；缺失时保留构建文件位置。

## 选择详细程度

默认 `info` 显示启动、重要操作、错误及恢复。正常轮询和输入区域更新保持安静。连续数值设置、自定义指令、名称、标签、Base URL 和模型数值参数归 debug。离散的 AI 变更留在 info，并写明变更，例如 `perception.desktop=on` 或 `vision=supported`。助手完成仍是 info，记录模型编号、协议、输入与输出规模、桌面帧状态和视觉能力；供应方返回用量时再附上 token 数。问题、回答和端点地址在任何级别都不记录。

同类轮询错误，以及重复的连续编辑，会计数并每分钟最多输出一次摘要。连续编辑的摘要是单独的 debug 行，不附在下一次操作上。

`debug` 增加查询及窗口生命周期；`trace` 增加逐次操作开始、轮询、页面／区域变化。控制台与文件使用同一可读格式。通过以下方式重新启动：

```powershell
$env:RIPPLE_LOG_LEVEL = 'trace'
pnpm start
# 停止本次运行后：
Remove-Item Env:RIPPLE_LOG_LEVEL
```

```sh
RIPPLE_LOG_LEVEL=trace pnpm start
```

打包后的可执行程序也接受 `--ripple-log-level=trace`。可选值为 `error`、`warn`、`info`、`debug`、`trace`，命令行优先于环境变量。只影响本次诊断，不修改保存的偏好。

## 提交问题

提供版本、系统、复现步骤和相关会话／操作块，保留原因链与源码栈；按操作编号将相关记录放在一起。日志保留应用编写的原因、校验约束、运行时异常细节及系统／HTTP 错误码；不记录任意服务商／原生命令消息、命令输出、请求／响应正文、密钥、剪贴板、问题或回答。trace 同样遵循此规则。崩溃转储是二进制内存快照，分享前先检查。

渲染层通过受限且经过校验的 preload 方法上报，主进程统一管理格式、级别、轮转及分窗口上下文。不注入额外日志 preload，也不截获任意渲染层控制台内容。
