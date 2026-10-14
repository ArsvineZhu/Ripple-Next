import type { Messages } from './en';

/** Original Apple-style wordplay; technical data and critical actions inherit ordinary zh-CN. */
export const zhApple = {
  guideTitle: '得心。更应手。',
  guideIntro:
    '把常用，用得更常。把设想，设成所想。从键位，到每一个可设的细节，读懂一点，用好不止一点。',
  aboutTagline: '小小一岛。大有可为。',
  guideKeyboard: '键到。即做到。',
  guideSettings: '设想，如你所设。',
  guideSecrets: '藏好，每一把钥匙。已保存的密钥以圆点显示；输入新值后，选择“更改”完成保存。',
  guideColors: '出色，出你的色。打开系统选取器，选择界面的颜色。',
  glassPreviewHint: '按下，透出不同。拖动，动得更你。试用控件，查看当前材质与形变。',
  liquidGlassExperimentalHint: '看得透。更看得出。调整设置控件的实验材质与响应。',
  islandGlassUnavailable: '新的可能，正在成形。内测中，尚未开放。',
  workflowsEmpty: '工作，待你流起来。在设置中添加一个工作流。',
  tasksEmpty: '空着，留给下一件事。在下方添加任务。',
  clipboardEmpty: '留白，等你复制。剪贴板暂无文字。',
  stateSaveFailed: '未存。再来一步。设置未能保存，请重试。',
  stateLoadFailed: '原有未至，默认已来。未能加载设置，现使用默认设置。',
  appLaunchFailed: '打开，未成。请检查应用目标后重试。',
  mediaCommandFailed: '此刻，未能响应。播放器未接受控制，请重试。',
  aiRequestFailed: '回应，尚未回应。AI 请求失败，请检查接口、密钥和模型。',
  confirmationFailed: '未成。再试一次。',
  copyFailed: '未能留住这一步。复制失败，请重试。',
  guideOpenSection: '设好下一步',
} satisfies Partial<Messages>;
