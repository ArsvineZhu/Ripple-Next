import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerWix } from '@electron-forge/maker-wix';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import type { ForgeConfig } from '@electron-forge/shared-types';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { version } from '../package.json';
import path from 'node:path';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const projectRoot = path.resolve(__dirname, '..');

const config: ForgeConfig = {
  packagerConfig: {
    asar: { unpack: '**/font-list/libs/darwin/fontlist' },
    ignore: (file: string) => {
      if (!file) return false;
      return !file.startsWith('/.vite') && !file.startsWith('/node_modules');
    },
    executableName: 'ripple-next',
    appBundleId: 'com.arsvinezhu.ripple-next',
    icon: 'src/assets/icons/icon',
    extraResource: [
      path.join(projectRoot, 'src/assets/icons/icon.png'),
      ...(process.platform === 'linux'
        ? [path.join(projectRoot, 'out/native/ripple-device-events')]
        : []),
      ...(process.platform === 'darwin'
        ? [path.join(projectRoot, 'native/macos-window/build/Release/macos_window.node')]
        : []),
      path.join(projectRoot, 'src/assets/third-party/liquid-glass-notices.txt'),
      path.join(projectRoot, 'src/assets/third-party/licenses.json'),
      ...(fs.existsSync(path.join(projectRoot, 'node_modules/electron/dist/LICENSES.chromium.html'))
        ? [path.join(projectRoot, 'out/license-assets/LICENSES.chromium.html')]
        : []),
    ],
    ...(process.platform === 'darwin'
      ? {
          extendInfo: {
            NSAppleEventsUsageDescription:
              'Ripple Next needs to control media players like Spotify and Apple Music.',
            // Agent like LuLu: Dock appears only via runtime setActivationPolicy('regular').
            LSUIElement: true,
          },
        }
      : {}),
  },
  hooks: {
    generateAssets: async (_config, platform, arch) => {
      if (platform === 'linux' || platform === 'darwin')
        execFileSync(
          process.execPath,
          [path.join(projectRoot, 'scripts/build-native.mjs'), `--arch=${arch}`],
          {
            cwd: projectRoot,
          },
        );
      execFileSync(process.execPath, [path.join(projectRoot, 'scripts/collect-licenses.mjs')], {
        cwd: projectRoot,
      });
      await fs.promises.rm(path.join(projectRoot, '.vite'), { recursive: true, force: true });
    },
    postPackage: async (forgeConfig, options) => {
      if (options.platform !== 'darwin') return;
      console.log('Signing application with entitlements...');

      for (const outPath of options.outputPaths) {
        const files = fs.readdirSync(outPath);
        const appFile = files.find((f) => f.endsWith('.app'));
        if (appFile) {
          const appPath = path.join(outPath, appFile);
          console.log(`Waiting for file lock release...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log(`Signing ${appPath}...`);
          try {
            execFileSync('codesign', [
              '--deep',
              '--force',
              '--verbose',
              '-s',
              '-',
              '--entitlements',
              path.resolve(projectRoot, '.config/entitlements.plist'),
              appPath,
            ]);
            console.log('Signed successfully.');
          } catch (e) {
            console.error('Sign failed, retrying without deep...');
            throw e;
          }
        }
      }
    },

    postMake: async (forgeConfig, makeResults) => {
      const platformLabel: Record<string, string> = {
        darwin: 'macOS',
        win32: 'Windows',
        linux: 'Linux',
      };

      for (const result of makeResults) {
        const os = platformLabel[result.platform] || result.platform;
        const renamedArtifacts: string[] = [];

        for (const artifactPath of result.artifacts) {
          const ext = path.extname(artifactPath);
          // Skip non-installer files (e.g. blockmap, yml)
          if (!['.dmg', '.msi', '.deb', '.rpm', '.zip'].includes(ext)) {
            renamedArtifacts.push(artifactPath);
            continue;
          }

          const archSuffix = result.platform === 'darwin' ? `-${result.arch}` : '';
          const portableSuffix = ext === '.zip' ? '-Portable' : '';
          const newName = `RippleNext-${os}${archSuffix}-v${version}${portableSuffix}${ext}`;
          const newPath = path.join(path.dirname(artifactPath), newName);

          fs.renameSync(artifactPath, newPath);
          console.log(`Renamed: ${path.basename(artifactPath)} → ${newName}`);
          renamedArtifacts.push(newPath);
        }

        result.artifacts = renamedArtifacts;
      }

      return makeResults;
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerWix({
      language: 1033,
      manufacturer: 'Arsvine Zhu',
      description: 'A Dynamic Island for All',
      name: 'Ripple Next',
      icon: path.join(projectRoot, 'src/assets/icons/icon.ico'),
      shortcutFolderName: 'Ripple Next',
      programFilesFolderName: 'Ripple Next',
      ui: {
        chooseDirectory: true,
      },
    }),

    new MakerDMG({
      name: 'RippleNextInstaller',
      format: 'UDZO',
      overwrite: true,
    }),
    new MakerDeb({
      options: {
        icon: path.join(projectRoot, 'src/assets/icons/icon.png'),
        name: 'ripple-next',
        desktopTemplate: path.join(projectRoot, '.config/templates/ripple-next.desktop.ejs'),
      },
    }),
    new MakerRpm({
      options: {
        ...{
          specTemplate: path.join(projectRoot, '.config/templates/ripple-next.spec.ejs'),
          appFileList: (source: string) => fs.readdirSync(source),
        },
        icon: path.join(projectRoot, 'src/assets/icons/icon.png'),
        name: 'ripple-next',
        execArguments: ['--ozone-platform=x11'],
      },
    }),
    new MakerZIP({}, ['darwin', 'win32', 'linux']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: '.config/vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: '.config/vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: '.config/vite.renderer.config.mts',
        },
      ],
    }),
    new AutoUnpackNativesPlugin({}),

    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
