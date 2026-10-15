<p align="center"><img src="src/assets/icons/icon.png" width="80" alt="Ripple Next"></p>
<h1 align="center">Ripple Next</h1>

<p align="center"><strong>次の一歩を、すぐそばに。</strong></p>
[简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [English](README.md) · **日本語**

音楽が流れ、開きたいリンクがあり、コピーしたコマンドが待っています。Ripple Next は Windows、macOS、Linux の日常操作を、ひとつの浮かぶ Island にまとめます。

idle でひと目、ホバーでもう少し、クリックでページを展開。設定は専用ウィンドウで行い、折りたたんでも下書きを保ちます。

[Ripple Next 4.1.0-beta.1](docs/releases/4.1.0-beta.1.en.md)。[ダウンロード](https://github.com/ArsvineZhu/Ripple-Next/releases) · [使い方（英語）](instructions.md) · [フィードバック](https://github.com/ArsvineZhu/Ripple-Next/issues)

> 画像と動画は独立デモ設定の実際のアプリです。アシスタントはローカルのサンプル応答、音楽はデモプレイヤーを使用。中国語画像は言語固有機能を紹介します。

## 七つのページを、ひとつの場所に

| ページ                       | 次の操作                                                   |
| ---------------------------- | ---------------------------------------------------------- |
| ブラウザー検索               | 既定ブラウザーで検索、HTTP(S) アドレスを開く。             |
| ワークフローとクイックアプリ | 一組を順番に、またはお気に入りをひとつ開く。               |
| 概要                         | 時刻、日付、電池、設定した天気を見る。                     |
| 再生中                       | プレイヤーを選び、操作し、前面に出す。                     |
| AI アシスタント              | 選んだサービスとモデルで Markdown を読み、コードをコピー。 |
| クリップボード               | このセッションでコピーした文字を再利用。                   |
| タスク                       | 次の用事を書き、終わったらチェック。                       |

## 音楽を、手の届くところに

アートワーク、アーティスト、操作をそばに。idle は短いカプセル、ホバーのクイックビューは広がって再生ボタンとアーティストを表示します。展開カードで曲を送り、アートワークからプレイヤーを開けます。

自動選択とプレイヤー表示で複数の再生元を移動できます。操作は表示中のプレイヤーに紐づき、戻ると長文スクロールが再開。3D と強さも選べます。Windows と Linux はネイティブイベントで情報と画像を別々に更新します。

![Now Playing](docs/assets/screenshots/media.png)

![Compact music](docs/assets/screenshots/media-compact.png)

![Hover quick view](docs/assets/screenshots/media-quick.png)

## 作業の一組を開く

ワークフローに名前を付け、アプリや URL を一行ずつ追加。ひとつの起動で順番に開き、失敗した項目を示しながら後続を続けます。クイックアプリは単独でも、ワークフローでも使えます。

![Workflows and quick apps](docs/assets/screenshots/workflows.png)

## サービスを選べるアシスタント

Chat Completions、OpenAI Responses、Anthropic Messages の接続先と暗号化キー、モデルを設定。モデルごとのプロンプト、パラメーター、順序付き注入を使えます。回答は Markdown で逐次表示、コードはネイティブコピー。設定したサービスへ送信します。

![Assistant sample response](docs/assets/screenshots/assistant.png)

## 自分に合う形へ

書体、テーマ、色と背景、画面、位置、角、ページ動作を選択。共通の操作で通常の変更は自動保存し、キーと破壊的操作は明確に確定。設定の Liquid Glass は押したレンズ、吸着点、ライブプレビューを備えます。

![General settings](docs/assets/screenshots/settings.png)

簡体字中国語では Standard、Microsoft Chinese、Apple Chinese を選べます。ヒントや空の状態、ガイドの語り口が変わり、技術項目、重要な操作、エラーと日時・数値の意味は変わりません。

![Microsoft Chinese expression](docs/assets/screenshots/chinese-microsoft.png)

![Apple Chinese expression](docs/assets/screenshots/chinese-apple.png)

## 実際の手順を見る

アプリ内ガイドはキー操作から始まり、書体、中国語表現、Glass、ワークフロー、AI 編集を実際に録画しています。中国語固有の例以外は英語です。文章は選択でき、動画は自分で再生し、画面外で停止します。

- [書体](src/assets/guide/typography.webm)
- [中国語表現](src/assets/guide/expression.webm)
- [Glass](src/assets/guide/appearance.webm)
- [ワークフロー](src/assets/guide/workflow.webm)
- [AI 設定](src/assets/guide/ai.webm)

![Recorded user guide](docs/assets/screenshots/guide.png)

## Ripple Next を使い始める

対応パッケージをインストールするか、ポータブル ZIP を展開して起動。最初に設定が開き、閉じても Island は動きます。再起動かトレイから設定を開けます。

| OS      | アーキテクチャ | パッケージ                 |
| ------- | -------------- | -------------------------- |
| Windows | x64            | MSI / ポータブル ZIP       |
| Linux   | x64            | DEB / RPM / ポータブル ZIP |
| macOS   | x64 / arm64    | DMG / ポータブル ZIP       |

macOS はアドホック署名です。Linux は X11/XWayland とキー用の OS 暗号化が必要です。連携ツールは[対応状況](docs/platform-compatibility.md)を参照。Island Glass と AI コンテキスト認識は未提供、Windows/Linux はトレイを表示します。

設定、ワークフロー、クイックアプリ、タスクは Ripple Next のユーザーデータに保存し、キーは OS 暗号化。クリップボード履歴はこの実行のみです。[使い方](instructions.md)、[診断](docs/diagnostics.md)、[撮影情報](docs/assets/screenshots/README.md)をご覧ください。

## 開発と貢献

`.node-version` の Node と `package.json` の pnpm を使用します。[開発](docs/development.md)、[構成](docs/architecture.md)、[テスト](tests/README.md)、[リポジトリ地図](INDEX.md)が現在の責務と手順を示します。

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm check
pnpm test
```
