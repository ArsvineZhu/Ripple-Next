import {
  loginLaunchRegistered as windowsRegistered,
  setAutoLaunch as windows,
} from './windows/autostart';
import {
  loginLaunchRegistered as linuxRegistered,
  setAutoLaunch as linux,
} from './linux/autostart';
import { setAutoLaunch as macos } from './macos/autostart';

export const setAutoLaunch =
  process.platform === 'win32' ? windows : process.platform === 'darwin' ? macos : linux;

export const loginLaunchRegistered =
  process.platform === 'win32'
    ? async () => windowsRegistered()
    : process.platform === 'darwin'
      ? async () => true
      : linuxRegistered;
