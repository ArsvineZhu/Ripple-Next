import type { Messages } from './en';

/** Original Microsoft-style parody; functional labels and destructive instructions inherit zh-CN. */
export const zhMS = {
  guideTitle: '让我们开始使你开始。',
  guideIntro:
    '欲穷千里目，更上一层楼。——唐·王之涣《登鹳雀楼》。我们已经为你准备了用于了解你正在使用的 Ripple Next 的指南。现在，你可以继续了。',
  aboutTagline: '我们使你希望做的事情，成为你能够做的事情。',
  guideKeyboard: '使键盘成为能够工作的键盘',
  guideSettings: '让你的设置使用你所选择的设置',
  guideSecrets:
    '我们已经使已保存的密钥以圆点的形式出现。要让新的密钥成为已保存的密钥，请选择“更改”。',
  guideColors: '选择一个颜色，使它成为你所选择的颜色。系统选取器将帮助你完成颜色的选择。',
  glassPreviewHint: '按下或拖动这些控件，使你能够预览这些控件在被按下或拖动时的表现。',
  liquidGlassExperimentalHint: '我们正在为设置提供一种可以使玻璃成为液态玻璃的实验。',
  islandGlassUnavailable: '我们正在处理使此选项能够成为可用选项的事情。目前尚未开放。',
  workflowsEmpty: '这里目前没有我们能够向你显示的工作流。请在设置中添加一个。',
  tasksEmpty: '你还没有尚未完成的任务。请在下方添加一个。',
  clipboardEmpty: '剪贴板目前没有能够作为内容显示的文字。',
  stateSaveFailed: '事情没有按我们希望的那样发生。设置未能保存，请重试。',
  stateLoadFailed: '我们未能使已保存的设置成为可用。现已使用默认设置。',
  appLaunchFailed: '应用程序没有成为已启动的应用程序。请检查目标后重试。',
  mediaCommandFailed: '播放器没有接受我们希望它接受的控制。请重试。',
  aiRequestFailed: '我们本来希望请求成功。AI 请求失败，请检查接口、密钥和模型。',
  confirmationFailed: '操作没有按预期完成。请重试。',
  copyFailed: '文字未能成为已复制的文字。请重试。',
  guideOpenSection: '继续以打开相关设置',
} satisfies Partial<Messages>;
