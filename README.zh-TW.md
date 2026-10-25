<p align="center"><img src="src/assets/icons/icon.png" width="80" alt="Ripple Next"></p>
<h1 align="center">Ripple Next</h1>

<p align="center"><strong>下一步，近在手邊。</strong></p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> ·
  <strong>繁體中文</strong> ·
  <a href="README.md">English</a> ·
  <a href="README.ja.md">日本語</a>
</p>

音樂正在播放，有個連結要開啟，剛複製的命令還在剪貼簿裡。Ripple Next 把這些日常操作放進浮動 Island，適用於 Windows、macOS 和 Linux。

閒置時簡短顯示，懸停查看更多，點擊展開完整頁面；獨立設定視窗負責配置，摺疊時草稿仍然保留。

Ripple Next 4.2.0。[官網](https://ripple.arsvine.com) · [下載](https://github.com/ArsvineZhu/Ripple-Next/releases/latest) · [使用指南（簡體中文）](instructions.zh-CN.md) · [回饋](https://github.com/ArsvineZhu/Ripple-Next/issues)

> 截圖與影片來自獨立示範設定中的實際應用。助手展示本機示範服務傳回的範例回答，媒體來自示範播放器；中文圖片介紹對應語言功能。

## 七個頁面，伸手就到

| 頁面               | 下一步操作                                          |
| ------------------ | --------------------------------------------------- |
| 瀏覽器搜尋         | 在預設瀏覽器搜尋或開啟 HTTP(S) 位址。               |
| 工作流程與快捷應用 | 依序開啟一組應用／位址，或單個常用目標。            |
| 概覽               | 查看時間、日期、電量及設定的天氣。                  |
| 正在播放           | 選擇播放器、控制播放並開啟視窗。                    |
| AI 助手            | 使用自選服務與模型，串流閱讀 Markdown、複製程式碼。 |
| 剪貼簿             | 重用本次執行最近複製的文字。                        |
| 任務               | 寫下接下來幾件事，完成後勾選。                      |

## 音樂，就在手邊

封面、歌手和控制留在附近。閒置時顯示較短的膠囊，不預留播放鍵位置；懸停快覽加寬、顯示播放／暫停並始終顯示歌手。歌手顯示偏好只影響閒置狀態。展開卡片可切歌，點擊封面開啟對應播放器。

自動來源與播放器指示器方便瀏覽多來源，控制始終針對目前卡片。長文字返回後恢復捲動，3D 封面與程度可調整。Windows／Linux 使用原生事件，分別更新中繼資料與封面。

![正在播放](docs/assets/screenshots/media.png)

![音樂閒置狀態](docs/assets/screenshots/media-compact.png)

![懸停快覽](docs/assets/screenshots/media-quick.png)

## 開啟一組工作環境

替工作流程命名，每行放一個應用或位址，一次啟動依序開啟。單個目標失敗單獨提示，後續繼續；快捷應用也能獨立啟動或重用到工作流程。

![工作流程與快捷應用](docs/assets/screenshots/workflows.png)

## 自選服務的助手

設定 Chat Completions、OpenAI Responses 或 Anthropic Messages，儲存加密金鑰並綁定模型。系統提示詞是內建的。每個模型有自己的參數；一段個人化指令和感知渠道對所有模型生效。回答串流顯示 Markdown，程式碼區塊支援原生複製。請求傳送到你設定的服務。

![助手範例回答](docs/assets/screenshots/assistant.png)

## 調成你的樣子

依字形補齊順序組合內建、系統與匯入字體，選擇主題、色彩／背景、顯示器、位置、圓角和行為。一般編輯自動儲存，憑據透過「儲存／更改」提交，刪除／清空等操作需確認；設定液態玻璃提供清晰按壓透鏡、節點吸附及即時預覽。

設定提供精簡圖示列、可展開分類面板及獨立的側欄半透明開關。

![一般設定](docs/assets/screenshots/settings.png)

簡體中文提供標準、微軟中文、蘋果中文。情境提示、空白狀態與指南有不同語氣，技術標籤、重要操作、錯誤及日期數字含義保持一致。

![微軟中文表達](docs/assets/screenshots/chinese-microsoft.png)

![蘋果中文表達](docs/assets/screenshots/chinese-apple.png)

## 看看實際怎麼做

應用指南首先介紹按鍵，實際錄製字體、中文表達、玻璃、工作流程和 AI 編輯。除中文特有示範外使用英文；文字可選取，影片由使用者控制播放，離開可視區時暫停。

- [介面介紹](src/assets/guide/interface.webm)
- [字體](src/assets/guide/typography.webm)
- [中文表達](src/assets/guide/expression.webm)
- [玻璃](src/assets/guide/appearance.webm)
- [工作流程](src/assets/guide/workflow.webm)
- [AI 設定](src/assets/guide/ai.webm)

![應用操作指南](docs/assets/screenshots/guide.png)

## 開始使用 Ripple Next

下載對應軟體包，安裝或解壓縮可攜式 ZIP 後啟動。設定先開啟，關閉設定保留 Island。開機自動啟動只開啟 Island。再次啟動或透過系統匣重新開啟設定。

| 平台    | 架構       | 軟體包               |
| ------- | ---------- | -------------------- |
| Windows | x64        | MSI／可攜式 ZIP      |
| Linux   | x64        | DEB／RPM／可攜式 ZIP |
| macOS   | x64／arm64 | DMG／可攜式 ZIP      |

macOS 使用臨時簽章。Linux 需要 X11／XWayland，金鑰需要系統安全加密；可選工具見[平台支持（簡體中文）](docs/platform-compatibility.zh-CN.md)。Island 液態玻璃尚未開放。AI 感知只有在開啟桌面通道且模型被標為支援影像後，才會在提問時傳送一幀。Windows／Linux 保留系統匣。

偏好、工作流程、快捷應用與任務保存在 Ripple Next 使用者目錄，憑據經系統加密，剪貼簿歷史屬於本次執行。見[使用與資料](instructions.zh-CN.md)、[診斷](docs/diagnostics.zh-CN.md)及[素材來源](docs/assets/screenshots/README.md)。

## 開發與貢獻

使用 `.node-version` 的 Node 與 pnpm。pnpm 12 更快。[開發](docs/development.zh-CN.md)、[架構](docs/architecture.zh-CN.md)、[測試](tests/README.zh-CN.md)和[倉庫地圖](INDEX.zh-CN.md)說明目前歸屬與流程。

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm check
pnpm test
```
