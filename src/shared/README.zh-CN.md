[English](README.md) · [架构](../../docs/architecture.zh-CN.md)

# 共享契约

共享层提供主进程、preload 和界面使用的可序列化数据、校验 schema 与纯策略。原生发现、文件访问、供应方请求和界面状态由所属运行层管理。

Application／LaunchTarget 描述已安装应用、HTTP(S) 快捷方式及命令 argv／工作目录。MediaSession／MediaSnapshot 描述能力、自动／手动选择、新鲜度与有界错误，控制必须携带当前会话 ID。稳定页面 ID 和布局策略独立于导航顺序。

AppState 管理持久化默认值及天气、字体、音乐、结构化 AI 图等偏好。AI schema 校验稳定 ID、绑定、每个模型的参数，以及共用的个人指令和感知渠道。schema 拒绝的形状保持拒绝。配置恢复选择带时间戳的备份路径，只有在备份完成或明确确认后才允许换成空的当前存储。凭据是主进程管理的具名安全记录，关联删除位于同一事务。

输入几何处理分数缩放与视口边界；背景／颜色策略规范化资源并保留透明度。诊断 schema 接受有界操作、视图和错误元信息，不包含剪贴板文字或原生协议正文。

en／zh-CN／zh-TW／ja 词典具有一致键与插值变量。微软／苹果中文覆盖语境提示，继承普通技术和关键措辞；私有 i18next 变体为 Intl 映射到标准 zh-CN。

见[开发](../../docs/development.zh-CN.md)、[测试](../../tests/README.zh-CN.md)和[仓库地图](../../INDEX.zh-CN.md)。
