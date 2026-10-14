[English](README.md) · [架构](../../docs/architecture.zh-CN.md)

# 渲染层

Island 提供七个日常功能页，设置使用独立配置和编辑窗口。两个界面通过 AppStateProvider 与类型化 preload API 接收主进程已提交状态，系统访问始终经具名桥接方法。

## 公共组合

`components/content` 管理按钮、文本输入、容器、空状态和反馈；`components/preferences` 基于这些控件组合偏好组、行、字段和操作。滑杆、开关、颜色及选择器管理自己的公共交互。功能文件负责布局、草稿和领域操作。

LaunchButton 管理串行启动及目标错误；MediaControl 绑定当前会话及能力；MediaArtwork 管理解码回退和悬停；MediaMarquee 测量实际文字、裁切区和字体变化，页面恢复后重新开始 CSS 滚动；MediaTransition 保留唯一当前层并执行 200ms 淡入／模糊。MarkdownContent 管理流式回答与原生复制。

## 状态与生命周期

页面注册表管理稳定 ID、顺序、可见性、几何和渲染。任务、搜索与编辑草稿由功能持有；React Activity 保留 Island 草稿并暂停隐藏页面效果，媒体、设备、剪贴板及活动助手位于这个生命周期之上。

交互状态机管理悬停、展开、焦点、菜单、拖动和折叠延迟。几何跟随可见尺寸和页面过渡；TabPanels 管理横向功能导航，MediaSessionCarousel 管理纵向播放器导航。原生纵向滚动和手势边界保持所属输入。

SettingsApp 管理分类、详情、过渡及滚动／焦点恢复。普通字段自动提交有效编辑，凭据使用明确的保存／更改，破坏性操作需要确认；系统效果失败时恢复已提交值。外观页启用主进程管理的 Island 实时预览。

## 音乐、语言与指南

idle 不预留播放键；悬停快览加宽并始终显示歌手，不受 idle 歌手开关影响。两种音乐卡片共用控制、封面、文字动画和独立错误区域。

所有界面使用已保存的 uiFont。en／zh-CN／zh-TW／ja 完整词典共享插值契约；微软／苹果中文用原创语境表达覆盖提示，继承技术字段、错误与关键操作。数字和日期使用有效地区语言格式。

SettingsGuide 使用真实英文流程录像，并包含中文特有表达演示。用户控制播放，同一时间只播放一段，隐藏、离开可视区或卸载时暂停，文字可以选择。见[拍摄来源](../assets/guide/README.md)、[玻璃模块](components/liquidGlass/README.zh-CN.md)与[开发指南](../../docs/development.zh-CN.md)。
