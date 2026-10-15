[English](README.md) · [共享契约](../shared/README.zh-CN.md)

# Preload 桥接

沙盒兼容 CommonJS bundle 通过 contextBridge 暴露类型化 electronAPI。所有操作使用具名方法，界面不获得原始 ipcRenderer 或任意通道访问。

桥接覆盖应用初始化与提交更新、功能 patch、AI 图和凭据操作、助手流、天气、原生启动／媒体／设备、剪贴板、选色、窗口输入／预览及诊断。主进程校验窗口身份和载荷。

媒体事件向双窗发送相同快照与选择；设备事件唤醒统一观察，能力标记描述当前原生后端。事件方法返回取消订阅函数，滚动手势及界面诊断通过有界 schema 校验。

只有设置能编辑 AI 配置／凭据、请求原生选色及控制临时 Island 预览；初始化和状态查询不返回明文密钥。见[架构](../../docs/architecture.zh-CN.md)和[开发指南](../../docs/development.zh-CN.md)。
