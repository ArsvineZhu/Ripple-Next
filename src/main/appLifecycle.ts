/** Linux keeps running while a tray icon can still reopen UI. */
export function shouldQuitAfterLastWindow(input: {
  platform: NodeJS.Platform;
  hasTray: boolean;
}): boolean {
  return input.platform === 'linux' && !input.hasTray;
}
