# 设计理念

Ripple Next 是一款紧凑的桌面伴侣。界面应当反馈直接、视觉平静，同时不干扰用户对桌面的掌控。

## 核心理念

### 用户语境与自主权

围绕用户正在做的事、已有认知和主动选择来设计。导航和编辑时延续用户意图，并让操作范围及后果清楚可见。复用页面已建立的语境，不在每个标签里重复对象名。例如，API 密钥字段旁的操作直接写“更改”即可，而非“更改 API 密钥”。

### 清晰的信息层级

让重要内容、当前状态和下一步有用操作容易找到。通过位置、间距、字体和对比度表达优先级。例如，主要操作采用最明确的强调，危险操作则清楚可辨且视觉克制。

### 可理解的反馈与恢复

让每个重要操作都有明确结果。反馈靠近来源，说明哪里需要处理，并在失败时保留用户已有内容。例如，网址格式错误时，在输入框下方说明原因，让用户就地修正。

### 一致而连贯的系统

让控件在整个应用中的含义和行为保持一致。共享 token 和组件提供稳定基础，具体呈现仍可适应任务。例如，菜单内容可以不同，但选择和焦点行为应保持一致。

### 可访问且可预测的交互

让鼠标、键盘和辅助技术用户都能完成操作。提供明确的可访问名称、可见焦点、足够的点击区域、清晰对比和熟悉的键盘行为。例如，可搜索的选项列表应支持输入文字、方向键、Enter 和 Escape。

### 克制且有目的的表达

视觉强调和动效要承担明确作用：引导注意、表达关系或说明状态变化。效果保持克制，让内容容易辨认。例如，展开或收起动画应帮助理解 Island 尺寸变化，不拖慢输入，也不掩盖布局突变。

## 视觉系统

Apple HIG 为 Ripple Next 的交互、反馈和可访问性提供指导。Vercel 与 v0 提供以 token 和可复用组件组织设计、再转为代码的工作方法。Ripple 的视觉语言保持紧凑、深色、低干扰，使用克制的表面、清楚的对比和有意图的动效。

颜色、间距、字体、圆角、焦点和动效使用共享 token。相关控件对齐；翻译较长时允许换行；并在 Island 支持的尺寸下检查布局。一致性帮助用户识别含义，同时保留不同任务真正需要的差异。

## 应用原则

每次修改先确认用户的任务、当前状态和下一步需要的反馈。组合运用这些理念：语境决定措辞，层级引导注意，反馈确认结果，可访问性让更多用户都能完成操作。完成后检查四种界面语言。

## 参考资料

- [Apple Human Interface Guidelines：设计原则](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Apple Human Interface Guidelines：按钮](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Apple Human Interface Guidelines：焦点与选择](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/)
- [Apple Human Interface Guidelines：数据输入](https://developer.apple.com/design/human-interface-guidelines/entering-data)
- [Apple Human Interface Guidelines：菜单](https://developer.apple.com/design/human-interface-guidelines/menus)
- [Vercel v0：设计系统](https://v0.dev/docs/design-systems)
- [Vercel：使用设计系统进行 AI 原型设计](https://vercel.com/blog/ai-powered-prototyping-with-design-systems)

## 阅读与学习

指南正文使用 16px、1.5–1.6 行高与约 60–75 字符行长。界面标签以 14px 为起点，注释不低于 12px，标题按层级缩小。短标题均衡换行，说明自然换行，变化数值使用等宽数字；指南正文可选择。字体选项使用同一样张，便于比较。

用真实应用操作录像说明流程，显示操作指针，由用户控制播放；键位说明放在最前。趣味中文仅在明确选择简体中文时可用，保留清晰的危险动作、技术标识与区域格式。
