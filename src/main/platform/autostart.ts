import { setAutoLaunch as windows } from './windows/autostart';
import { setAutoLaunch as linux } from './linux/autostart';
import { setAutoLaunch as macos } from './macos/autostart';

export const setAutoLaunch =
  process.platform === 'win32' ? windows : process.platform === 'darwin' ? macos : linux;
