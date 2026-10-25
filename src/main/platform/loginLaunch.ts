export const loginLaunchArgument = '--ripple-launched-at-login';

export function launchedAtLogin(argv: readonly string[], openedByLoginItem = false) {
  return openedByLoginItem || argv.includes(loginLaunchArgument);
}
