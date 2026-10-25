import fs from 'node:fs';
import path from 'node:path';
export async function captureFlows({ electron, page, root, directory }) {
  const pause = (ms) => page.waitForTimeout(ms);
  const cat = async (id) => {
    await page.locator(`[data-settings-category="${id}"]`).first().click();
    await pause(800);
  };
  const detail = async (id) => {
    await page.locator(`[data-settings-entry="${id}"]`).click();
    await pause(800);
  };
  const poster = async (name) => {
    await pause(700);
    await page.screenshot({
      path: path.join(root, 'src/assets/guide', name + '.png'),
      scale: 'css',
    });
  };
  const shot = async (name) => {
    await pause(450);
    await page.screenshot({
      path: path.join(root, 'docs/assets/screenshots', name + '.png'),
      scale: 'css',
    });
  };
  await page.evaluate(() => {
    const p = document.createElement('div');
    p.id = 'capture-pointer';
    Object.assign(p.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '12px',
      height: '12px',
      border: '2px solid #fff',
      background: '#1118',
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: '2147483647',
      transform: 'translate(-50%,-50%)',
      display: 'none',
    });
    document.body.append(p);
    document.addEventListener('pointermove', (e) => {
      p.style.display = 'block';
      p.style.left = e.clientX + 'px';
      p.style.top = e.clientY + 'px';
    });
  });
  const videoPath = await page.video().path();
  const videoEpoch = fs.statSync(videoPath).birthtimeMs;
  const clips = [];
  let mark;
  const begin = async (name) => {
    await pause(600);
    mark = { name, start: Date.now() };
  };
  const end = async () => {
    await pause(900);
    clips.push({ ...mark, end: Date.now() });
    fs.writeFileSync(
      path.join(directory, 'clips.json'),
      JSON.stringify({ clips, videoPath, videoEpoch }),
    );
  };
  const back = async () => {
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await pause(650);
  };
  await cat('general');
  await shot('settings');
  await begin('interface');
  await page.getByRole('button', { name: 'Toggle settings sidebar' }).click();
  await pause(900);
  await page.getByRole('button', { name: 'Toggle settings sidebar' }).click();
  await pause(900);
  for (const id of ['appearance', 'behavior', 'pages', 'shortcuts', 'integrations', 'general'])
    await cat(id);
  await poster('interface');
  await end();
  await begin('typography');
  await detail('fonts');
  await page.getByRole('button', { name: 'Add a font', exact: true }).click();
  await pause(450);
  await page.getByRole('option', { name: 'OpenRunde', exact: false }).click();
  await pause(800);
  await page.getByRole('button', { name: 'Move OpenRunde up', exact: true }).click();
  await pause(800);
  await page
    .getByRole('textbox', { name: 'Preview — edit this text' })
    .fill('Ripple Next. Every step, in its place.\nAa Bb 0123456789 · 中文 · 日本語 · Ελληνικά');
  await pause(900);
  await shot('font-settings');
  await poster('typography');
  await page.getByRole('button', { name: 'Restore default font', exact: true }).click();
  await pause(700);
  await back();
  await end();
  await cat('appearance');
  await begin('appearance');
  await detail('liquidGlass');
  await shot('liquid-glass-settings');
  await poster('appearance');
  await page.locator('[data-glass-preview]').screenshot({
    path: path.join(root, 'docs/assets/screenshots/glass-controls-rest.png'),
    scale: 'css',
  });
  const slider = page.getByRole('slider', { name: 'Preview slider', exact: true });
  const b = await slider.boundingBox();
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2);
  await page.mouse.down();
  await pause(500);
  await page.locator('[data-glass-preview]').screenshot({
    path: path.join(root, 'docs/assets/screenshots/glass-slider-held.png'),
    scale: 'css',
  });
  await page.mouse.move(b.x + b.width * 0.8, b.y + b.height / 2, { steps: 40 });
  await pause(500);
  await page.mouse.up();
  await pause(700);
  const sw = page.getByRole('switch', { name: 'Preview switch', exact: true });
  const sb = await sw.boundingBox();
  await page.mouse.move(sb.x + sb.width * 0.8, sb.y + sb.height / 2);
  await page.mouse.down();
  await pause(500);
  await page.locator('[data-glass-preview]').screenshot({
    path: path.join(root, 'docs/assets/screenshots/glass-switch-held.png'),
    scale: 'css',
  });
  await page.mouse.move(sb.x + sb.width * 0.2, sb.y + sb.height / 2, { steps: 30 });
  await pause(500);
  await page.mouse.up();
  await pause(700);
  await page.getByRole('switch', { name: 'Use Liquid Glass in Settings', exact: true }).click();
  await pause(900);
  await page.getByRole('switch', { name: 'Use Liquid Glass in Settings', exact: true }).click();
  await pause(900);
  await back();
  await end();
  await cat('shortcuts');
  await shot('workflows-settings');
  await begin('workflow');
  await detail('addWorkflow');
  await page.getByRole('textbox', { name: 'Workflow Name', exact: true }).fill('Morning focus');
  await pause(600);
  await page
    .getByRole('textbox', { name: 'Target 1', exact: true })
    .fill('https://example.com/notes');
  await pause(700);
  await page.getByRole('button', { name: 'Add target', exact: true }).click();
  await pause(500);
  await page
    .getByRole('textbox', { name: 'Target 2', exact: true })
    .fill('https://example.org/reading');
  await pause(800);
  await shot('workflow-editor');
  await poster('workflow');
  await back();
  await end();
  await cat('general');
  await begin('expression');
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitemradio', { name: '简体中文', exact: true }).click();
  await pause(900);
  const chooseStyle = async (text) => {
    await page.getByRole('button', { name: '中文表达', exact: true }).click();
    await page.getByRole('menuitemradio', { name: text, exact: false }).click();
    await pause(800);
  };
  await chooseStyle('微软');
  await cat('about');
  await shot('chinese-microsoft');
  await poster('expression');
  await pause(800);
  await cat('general');
  await chooseStyle('苹果');
  await cat('about');
  await shot('chinese-apple');
  await pause(800);
  await cat('general');
  await page.getByRole('button', { name: '语言', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
  await pause(800);
  await end();
  await page.evaluate(async () => {
    const api = window.electronAPI;
    await api.mutateAIConfiguration({ kind: 'add-credential', endpointId: 1 });
    const state = await api.getAppBootstrap();
    const key = state.state.settings.ai.credentials.at(-1).id;
    await api.saveAICredential(key, 'demo-key-not-a-real-credential');
    await api.mutateAIConfiguration({
      kind: 'edit-endpoint',
      id: 1,
      label: 'Demo endpoint',
      baseUrl: 'https://api.example.com/v1',
    });
    await api.mutateAIConfiguration({ kind: 'add-model', endpointId: 1, credentialId: key });
    const next = await api.getAppBootstrap();
    const id = next.state.settings.ai.models.at(-1).id;
    await api.mutateAIConfiguration({
      kind: 'edit-model',
      id,
      endpointId: 1,
      credentialId: key,
      name: 'demo-assistant',
      label: 'Everyday assistant',
    });
    await api.mutateAIConfiguration({ kind: 'select-model', id });
  });
  await cat('integrations');
  await begin('ai');
  await detail('aiEndpoints');
  await shot('ai-endpoints');
  await page.locator('[data-settings-entry="aiEndpoint-1"]').click();
  await pause(700);
  await page.getByRole('textbox', { name: 'Display name', exact: true }).fill('My service');
  await pause(600);
  await back();
  await back();
  await detail('aiModels');
  await page.locator('[data-settings-entry^="aiModel-"]').first().click();
  await pause(700);
  await shot('ai-customization');
  await back();
  await back();
  await detail('aiShared');
  await page
    .getByRole('textbox', { name: 'Custom instruction', exact: true })
    .fill('Keep answers practical and concise. Use {{battery}} when it helps.');
  await pause(900);
  await shot('ai-shared');
  await poster('ai');
  await back();
  await end();
  await cat('about');
  await shot('about');
  await cat('guide');
  await shot('guide');
  const island = electron.windows().find((p) => !p.url().includes('#'));
  if (!island) throw Error('No Island');
  await island.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => window.electronAPI.setIslandPreview(true));
  await pause(1000);
  for (const [n, name] of [
    [1, 'search'],
    [2, 'workflows'],
    [3, 'overview'],
    [4, 'media'],
    [5, 'assistant'],
    [6, 'clipboard'],
    [7, 'tasks'],
  ]) {
    await island.locator('body').press('Control+' + n);
    await pause(1000);
    if (n === 5) {
      const input = island.locator('textarea,input[type="text"]').filter({ visible: true }).first();
      await input.fill('Help me plan a quiet hour of focused work.');
      await input.press('Enter');
      await pause(1600);
    }
    await island.locator('#Island').screenshot({
      path: path.join(root, 'docs/assets/screenshots', name + '.png'),
      omitBackground: true,
      scale: 'css',
    });
  }
  await island.locator('body').press('Control+4');
  await pause(800);
  await island.locator('#Island').hover();
  await pause(200);
  await page.evaluate(() => window.electronAPI.setIslandPreview(false));
  await island.mouse.move(0, 500);
  await pause(1800);
  await electron.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().includes('#settings'))
      .focus(),
  );
  await pause(1000);
  await island.locator('#Island').screenshot({
    path: path.join(root, 'docs/assets/screenshots/media-compact.png'),
    omitBackground: true,
    scale: 'css',
  });
  await page.evaluate(() => window.electronAPI.updateAppState({ settings: { standbyMode: true } }));
  await pause(1000);
  await island.locator('#Island').screenshot({
    path: path.join(root, 'docs/assets/screenshots/media-quick.png'),
    omitBackground: true,
    scale: 'css',
  });
  fs.writeFileSync(
    path.join(directory, 'clips.json'),
    JSON.stringify({ clips, videoPath, videoEpoch }),
  );
}
