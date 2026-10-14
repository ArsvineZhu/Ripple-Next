import type { Messages } from './en';

/** Authored contextual wordplay; critical errors/actions and technical labels inherit zh-CN. */
export const zhMS = {
  guideTitle: '你好。让我们从这里开始。',
  guideIntro:
    '你的下一步，不必藏在另一个窗口里。我们已将常用操作放在手边：从键盘出发，看看怎样让这座小岛更适合你。',
  aboutTagline: '为你正在做的事，准备好接下来要做的事。',
  guideKeyboard: '你的键盘，还有更多可能',
  guideSettings: '按照你的方式，准备就绪',
  guidePages: '去往你希望前往的页面',
  guidePagesHint: '展开 Island 后，使用左右方向键切换页面。正在输入文字时，方向键仍用于编辑文字。',
  guideJump: '下一站，由你选择',
  guideJumpHint: '使用 Ctrl+1 至 Ctrl+7 直接前往页面。编号遵循你安排的可见页面顺序。',
  guideControls: '选择一个控件，然后继续',
  guideControlsHint:
    '使用 Tab 移动焦点，Enter 或空格操作控件；Esc 关闭菜单。你的鼠标也随时可以加入。',
  guideSliders: '一点一点，找到合适的值',
  guideSlidersHint:
    '方向键调整滑杆，Shift 缩小步幅，Home 与 End 前往两端。每一步都能在真实数值上看到。',
  guideGestures: '向左右滚动，即可前往另一页；向上下滚动，继续阅读这一页。让每一种手势都各有所用。',
  guideSecrets:
    '已保存的 API 密钥以圆点显示，并在本机加密。输入替代值之后，请选择“更改”；仅输入不会保存。',
  guideColors: '你喜欢的颜色，可以从系统选色器中找到。选择它，让界面也使用它。',
  guideReopen:
    '我们就在这里。再次启动 Ripple 或从托盘打开设置；关闭设置窗口后，Island 仍会继续运行。',
  guideOpenSection: '打开设置，进行下一步',
  guideTypographyTitle: '为每一段文字，找到合适的字体',
  guideTypographyBody:
    '相同的文字，不同的感受。比较文字与数字样例，再选择你喜欢的字体；Island 和设置会一起采用它。',
  guideTypographyStep1:
    '在“常规”中打开“字体”。看看阿里巴巴普惠体 3、系统字体和 OpenRunde，选择读起来最舒适的一种。',
  guideTypographyStep2: '选择系统字体或 OpenRunde，比较同样的文字与数字。找到你喜欢的，就保留它。',
  guideTypographyStep3: '设置与 Island 会一起使用你的选择。内置字体在需要时从本地加载。',
  guideWorkflowTitle: '准备一个工作流，开始一组事情',
  guideWorkflowBody:
    '有些事情，适合一起打开。快捷应用负责一个目标，工作流按顺序打开一组目标；视频演示命名、逐行添加地址与返回列表。',
  guideWorkflowStep1:
    '从添加入口选择应用、网站或命令，为它取一个方便辨认的名字。这样，你很快就能在 Island 中找到它。',
  guideWorkflowStep2:
    '每行放一个应用或地址，使用 + 添加行，使用 × 移除行。地址中的逗号会保留在地址里；点击已有名称即可编辑。',
  guideWorkflowStep3:
    '准备好之后，在 Island 中启动工作流。单个目标失败会在对应行提示，后面的目标仍会继续打开。',
  guideGlassTitle: '轻轻按下，看看会发生什么',
  guideGlassBody:
    '你的操作，也可以看得见。按住、拖动与切换预览控件，调整材质；吸附点会帮助你靠近合适的值。',
  guideGlassStep1: '按下时手柄立即放大。拖动靠近刻度节点时会减速并吸附；继续拖动即可越过它。',
  guideGlassStep2: '按住开关向另一边拖动，越过中点即可切换状态。松开后，手柄回到静止外观。',
  guideGlassStep3:
    '在位置设置后打开“液态玻璃（实验）”，上方的实时预览会反映参数。关闭设置玻璃可使用普通控件；Island 玻璃尚未开放。',
  guideAITitle: '让接口、密钥与模型准备好相遇',
  guideAIBody:
    '先配置服务，再提出问题。录像使用演示接口与密钥，展示模型、系统提示词与时间注入的编辑，不发送模型请求。',
  guideAIStep3:
    '选择默认模型，或在助手中切换。每个模型都可以设置自己的提示词、温度、推理参数和限制。',
  guideAIStep4:
    '将需要的文字放入注入列表，启用并排序。它们会依次追加到系统提示词；上下文感知尚未开放。',
  guideEditorHelp:
    '看到箭头时，还有一个编辑页等着你。返回按钮带你回到原来的滚动位置；删除或清空之前，会请你确认。',
  fontSettingsHint: '看看同样的字，试试不同的字体。选中后，设置与 Island 会一起使用你的选择。',
  fontSample: 'Ripple Next。接下来，照你的方式来。',
  chineseStyleHint: '你可以换一种中文表达。操作含义、日期与数字格式保持一致。',
  chineseMicrosoftHint: '亲切的引导、认真得有些直译的表达，以及不经意的一句诗。',
  chineseAppleHint: '简短的双关、合适的留白，让熟悉的话换一种听起来的方式。',
  findingApplications: '正在查找已安装的应用。美好的事情值得等待片刻。',
  workflowsEmpty: '一切准备从这里开始。在设置中添加工作流，或先添加一个快捷应用。',
  workflowEditorHint: '为一起使用的应用和网站准备一个名字，然后把目标逐行放进来。',
  workflowRowsHint: '一行，一个目标。应用、路径或网站都可以；地址中的逗号仍属于这个地址。',
  workflowAutosaveHint: '有了名称和第一个目标，工作流就会自动保存。之后的编辑也会随输入保存。',
  workflowNameHint: '例如：准备开始工作',
  quickAppEditorHint: '找到常用的应用、命令或网站，把下一次打开它的入口留在手边。',
  quickAppNameHint: '给这个按钮一个容易找到的名字',
  tasksEmpty: '今天还没有写在这里的任务。千里之行，始于足下；从下方的一件小事开始吧。',
  newTask: '接下来，你想完成什么？',
  clipboardEmpty: '这里会记住你复制过的文字。试着复制一段，回来看看。',
  copied: '已复制。下一步，可以粘贴了。',
  askAnything: '有什么希望我们一起想一想？',
  thinking: '正在整理想法，请稍候…',
  askAnother: '让我们继续一个新问题',
  nothingPlaying: '你的音乐还没有在这里响起。',
  playMusicHint: '在支持系统媒体会话的播放器中开始播放，歌曲就会来到这座岛上。',
  musicSettingsHint: '看看封面怎样动、长文字怎样读，以及音乐来自哪里。',
  musicArtwork3DHint: '移动指针，封面会随之倾斜。紧凑与展开视图都能看到这个效果。',
  musicArtworkStrength: '选择合适的立体程度',
  musicMarqueeHint: '长歌名和歌手信息会慢慢滚动。关闭后，它们会停留在原处。',
  musicIdleArtistHint: '决定 idle 时是否显示歌手。悬停快览始终显示歌手，并提供播放按钮。',
  musicPlayerHint:
    '自动选择，或指定一个正在运行的播放器。Island 与这里使用同一来源，直到播放器退出。',
  musicPlayerEmpty: '先在播放器里播放一点什么。我们会在这里等它出现。',
  glassPreviewHint: '按住或拖动一下。当前材质和运动会在这里回应你的操作。',
  liquidGlassExperimentalHint: '看看设置控件在不同材质与指针响应下的表现。',
  settingsGlassEnabledHint: '关闭后使用普通控件，页面与菜单仍保留通用过渡。',
  islandGlassUnavailable: '此功能尚未开放。你仍可以调整设置窗口中的玻璃效果。',
  glassPreview: '看看你的设置会如何呈现',
  fontSettingsRowHint: '选择阅读起来舒适的界面字体',
  autosavedSettingsHint: '你的更改会自动保存。',
  systemLanguageHint: '让 Ripple 使用你的操作系统所选择的语言。',
  systemTimeZoneHint: '与操作系统使用相同的时区。让时间保持同步。',
  hourFormatHint: '关闭后使用 24 小时制。请选择你熟悉的时间表达。',
  standbyHint: '指针离开后仍保留快览。此选项优先于保持完整页面展开。',
  largeStandbyHint: '未启用快览待机时，指针离开后仍保留完整页面。',
  mouseLeaveDelayHint: '给这座岛一点时间。指针离开后，等待指定时间再折叠。',
  islandCornerRadiusHint: '调整展开页面的圆角；折叠时保持胶囊形状，Windows 95 主题使用直角。',
  defaultThemeHint: '黑色背景，白色文字。你也可以为它们选择自己的颜色。',
  sleekBlackHint: '让背景透出一点桌面，文字依然保持白色。',
  win95ThemeHint: '经典灰色、斜面边框与直角。熟悉的外观，也能留在手边。',
  backgroundImageHint: '图片网址或本地文件路径。让这座岛拥有你的背景。',
  locationHint: '城市、地区、国家：从你所在的地方开始',
  manualLocationHint: '输入城市，需要时再加地区和国家。全部留空即可隐藏天气。',
  detectingLocation: '正在估算你的位置，请稍候…',
  detectedLocation: '我们估算的当前位置',
  searchHint: '搜索一点什么，或前往一个地址',
  noTimeZoneMatches: '没有找到对应的时区。换一个名字试试。',
  quickApps: '随时准备好的快捷应用',
  guideRecordingNote:
    '这些流程在真实 Ripple Next 界面与独立演示配置中录制，以英文为主；中文表达章节展示对应语言。使用视频控件播放、暂停或跳转。',
} satisfies Partial<Messages>;
