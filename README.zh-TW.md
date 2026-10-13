<p align="center">
  <img src="src/assets/icons/icon.png" width="80" alt="Ripple Next 圖示">
</p>

<h1 align="center">Ripple Next</h1>

<p align="center"><strong>把桌面的常用操作，收進一座靈動島。</strong></p>
<p align="center">適用於 Windows、macOS 與 Linux 的 Dynamic Island 桌面助手。</p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> ·
  <strong>繁體中文</strong> ·
  <a href="README.md">English</a> ·
  <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://github.com/ArsvineZhu/Ripple-Next/releases">下載</a> ·
  <a href="instructions.zh-CN.md">使用指南（簡體中文）</a> ·
  <a href="https://github.com/ArsvineZhu/Ripple-Next/issues">問題回報</a>
</p>

音樂正在播放，臨時想開啟一個網址，剛複製的指令又找不到了，還想到一件待辦事項。Ripple Next 把這些零碎卻常見的操作放進桌面上的一座懸浮島，讓你少切換一次視窗，繼續眼前的工作。

平時維持精簡，移入游標查看簡短資訊，點擊後展開完整功能頁。島的大小隨內容變化，頁面切換帶有連續的動畫過渡；島以外的桌面仍可正常點擊。

<p align="center">
  <img src="docs/assets/screenshots/media.png" width="440" alt="音樂卡片顯示歌曲封面、播放控制，以及島內右側的 A 與播放器圓點">
</p>

> 截圖來自實際執行的 Linux 應用程式，媒體、AI 回答、剪貼簿、天氣與電量使用示範內容。完整更新請見 [4.0.0 正式版說明（簡體中文）](docs/releases/4.0.0.zh-CN.md)。

## 七個 Island 頁面與獨立設定窗口

| 頁面                       | 可以做什麼                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **瀏覽器搜尋**             | 將搜尋字詞或 HTTP(S) 位址交給預設瀏覽器，支援自訂搜尋網址範本。                                                  |
| **工作流程與快捷應用程式** | 依序開啟一組應用程式和網頁，或直接啟動常用入口；快捷項目支援已安裝程式、網址，以及分開填寫參數的指令。           |
| **概覽**                   | 一眼查看時間、日期、天氣和電量；選擇 12／24 小時制、時區、天氣地點與攝氏／華氏單位。                             |
| **正在播放**               | 查看歌曲及封面，暫停／繼續、切換曲目、喚起播放器；多個播放器之間可上下捲動選擇。                                 |
| **AI 助手**                | 設定自己的 Chat Completions、Responses 或 Anthropic 端點與編號模型，閱讀串流 Markdown 回答，一鍵複製程式碼區塊。 |
| **剪貼簿**                 | 找回最近複製的文字，每筆都有複製按鈕；記錄只保留於目前工作階段。                                                 |
| **待辦事項**               | 隨手新增任務，完成後勾選移除；尚未完成的任務會保留至下次啟動。                                                   |
| **設定窗口**               | 啟動應用時開啟獨立窗口，依螢幕、習慣和語言調整外觀、位置、頁面順序與啟動行為。                                   |

## 音樂控制，隨時在手邊

不用為了暫停一首歌而尋找播放器視窗。精簡檢視顯示曲目，移入游標即可快速暫停或繼續；展開卡片後，封面、歌手和上一首／下一首控制都在眼前。點擊封面區域也能喚起對應播放器。

同時開啟多個播放器時，音樂頁會成為上下排列的卡片：

- 第一頁 **A** 代表自動選擇，選取它即可恢復自動模式。
- 每個**圓點**對應一個播放器。可上下捲動、點擊圓點，或聚焦音樂區域後使用上下方向鍵。
- 手動選擇會在本次執行期間鎖定該播放器，直到它結束；播放控制始終針對卡片上的播放器。
- 每段連續滾輪／觸控板手勢切換一頁，音樂頁抵達首尾後停止；橫向手勢仍用來切換島的功能頁。

封面來自播放器提供的媒體中繼資料。Linux 瀏覽器提供的暫存封面即使沒有圖片副檔名，也能顯示；未提供或解碼失敗時，會顯示整潔的音樂預留圖示。

<p align="center">
  <img src="docs/assets/screenshots/media-compact.png" width="300" alt="精簡音樂檢視顯示曲目與歌手">
</p>

媒體整合使用 Windows 系統媒體工作階段、Linux MPRIS，以及 macOS 上正在執行的 Spotify／Music。可用控制及封面取決於播放器；詳細限制請見[平台相容性說明（簡體中文）](docs/platform-compatibility.zh-CN.md)。

## 一次開啟，一起開始

替工作流程命名，填入一起使用的程式或網址，接著點擊一個按鈕就能開啟整組入口。開發時，可以同時開啟文件與 `localhost:3000/`；本機位址會自動加上 HTTP，保留路徑及查詢參數，交給系統預設瀏覽器。

個別常用入口則放在快捷應用程式列：選擇已安裝程式、填入 HTTP(S) 網址，或輸入可執行指令、每行一個參數及選用的工作目錄。啟動失敗會顯示在對應項目旁；工作流程會繼續嘗試剩餘目標，並在自己的列內回報失敗。

<p align="center">
  <img src="docs/assets/screenshots/workflows.png" width="480" alt="兩個命名工作流程，以及 Docs、GitHub 和 Local API 快捷入口">
</p>

## AI 助手，端點與模型由你選擇

在設定中建立有序號的 OpenAI 相容 Chat Completions、OpenAI Responses 或 Anthropic 端點，為端點儲存金鑰，再綁定模型。每個模型可分別設定系統提示詞、有序注入、溫度與思考參數。回答串流至 Island，以 Markdown 排版，程式碼區塊提供複製按鈕；達到螢幕可用高度後可捲動閱讀。

點擊**再問一個**，清除目前問答並開始新問題。Ripple Next 提供互動介面，服務端與模型由你選擇。

API 金鑰透過作業系統加密保護，不會傳回介面。Linux 儲存金鑰需要可用的系統加密服務。提問與回答交由你設定的端點處理。

<p align="center">
  <img src="docs/assets/screenshots/assistant.png" width="380" alt="AI 示範回答以 Markdown 呈現，並附程式碼區塊複製按鈕">
</p>

## 讓日常的小事有地方安放

概覽把清楚的時鐘、日期、天氣和電量放在一起。時間依所選時區顯示，天氣依設定地點更新；電池徽章按百分比填滿，充電時變成綠色。充電與裝置活動也能以短暫狀態提示出現。

<p align="center">
  <img src="docs/assets/screenshots/overview-zh-TW.png" width="380" alt="繁體中文概覽顯示時間、日期、晴天天氣與充電電量徽章">
</p>

剪貼簿收納「可能還會用到的文字」，待辦事項記下「還沒完成的事情」。點一下即可重新複製記錄；隨手新增任務，完成後勾選。文字記錄是暫時的，待辦事項則儲存在本機。

<table>
  <tr>
    <td><img src="docs/assets/screenshots/clipboard.png" width="380" alt="最近複製的文字及每筆獨立的複製按鈕"></td>
    <td><img src="docs/assets/screenshots/tasks.png" width="380" alt="附核取方塊的待辦清單與新增任務欄位"></td>
  </tr>
</table>

## 配合你的桌面習慣

- **放在順手的位置。** 選擇顯示器、使用吸附位置，或用滑桿即時調整自由位置；進入外觀設定時保持 Island 預覽可見。 滑桿兩端有方向提示，靠近刻度輕微吸附，刻度之間仍可自由停留。
- **選擇喜歡的外觀。** 預設、Sleek Black 與 Windows 95 主題；自訂顏色、圖片網址或本機背景；選用邊框，並可調整展開圓角（0–60px）。
- **直接調整設定。** 從圖文與互動動畫的使用指南開始。設定配有清楚圖示，一般編輯自動儲存，金鑰需手動儲存／更改。滑桿與開關靜止時為白色膠囊，按住時展開清晰玻璃透鏡，選單高亮連續移動。外觀與位置提供液態玻璃實驗參數，可關閉並恢復一般控制項；靈動島玻璃尚未開放。紅色危險操作需確認，關於頁先顯示軟體資訊，再提供第三方授權。
- **留下常用頁面。** 重新排序或隱藏七個 Island 功能頁，選擇預設頁面；啟動 Ripple 或透過系統匣選單開啟設定窗口。
- **決定顯示時機。** 精簡、懸停與展開檢視；非活動時隱藏、快速待機、展開待機，以及 0–2000 ms 的游標離開延遲。
- **配合啟動習慣。** 開機啟動；macOS 可開關選單列圖示，Windows／Linux 始終保留系統匣。平台差異見指南。
- **使用熟悉的語言。** 简体中文、繁體中文、English、日本語；預設跟隨系統，手動選擇立即套用，並於重新啟動後保留。

<p align="center">
  <img src="docs/assets/screenshots/settings.png" width="440" alt="設定頁中的語言、時間格式、時區、啟動、選單列圖示與顯示器選項">
</p>

## 開始使用

本次版本為 **Ripple Next 4.0.0 正式版**，完整更新請見[發布說明（簡體中文）](docs/releases/4.0.0.zh-CN.md)。前往 [Releases](https://github.com/ArsvineZhu/Ripple-Next/releases) 下載對應平台的 `RippleNext-…` 套件。

| 平台    | 發布組建目標                   | 安裝形式                 |
| ------- | ------------------------------ | ------------------------ |
| Windows | x64                            | MSI 安裝程式或可攜式 ZIP |
| macOS   | Intel x64／Apple Silicon arm64 | DMG 或可攜式 ZIP         |
| Linux   | x64                            | DEB、RPM 或可攜式 ZIP    |

安裝對應平台的套件，或解壓縮可攜式 ZIP 後執行 Ripple Next。每次啟動應用都會開啟設定窗口；再次啟動會喚起現有實例的設定窗口。移入游標查看簡短資訊，點擊島的背景展開。在設定 AI 前，也可以先使用本機功能。初次設定與完整操作請見[使用指南（簡體中文）](instructions.zh-CN.md)，原生權限與限制請見[平台相容性說明（簡體中文）](docs/platform-compatibility.zh-CN.md)。

### 執行目前原始碼

使用 [.node-version](.node-version) 中的 Node **22.23.3**，以及 [package.json](package.json) 固定的 pnpm **12.9.1**：

```sh
git clone https://github.com/ArsvineZhu/Ripple-Next.git
cd Ripple-Next
pnpm install --frozen-lockfile
pnpm start
```

相依套件、檢查、封裝與平台排查由[開發指南（簡體中文）](docs/development.zh-CN.md)統一說明。修改主處理程序或 preload 後，必須重新啟動應用程式；只更新 renderer 不會載入這些變更。

## 本機資料與外部服務

設定、待辦事項、工作流程與快捷應用程式儲存在 Ripple Next 自己的本機資料庫。API 金鑰密文由系統加密服務保護。剪貼簿記錄只保留於目前工作階段；AI 問答保留於目前工作階段。

搜尋和網頁交給系統瀏覽器；天氣服務會接收設定的地點；AI 使用你設定的端點。本機診斷不會記錄 API 金鑰、剪貼簿文字、提問或回答，當機報告不會自動上傳。Minidump 是處理程序快照，分享前應自行檢查。

Ripple Next 使用獨立設定。將設定移至另一作業系統時，已安裝程式的啟動目標仍有平台限制。

## 繼續了解與參與

- [使用指南（簡體中文）](instructions.zh-CN.md)：模式、導覽、七個 Island 頁面、設定與常見排查。
- [文件目錄（簡體中文）](docs/INDEX.zh-CN.md)：開發、發布驗證與目前平台行為。
- [儲存庫地圖（簡體中文）](INDEX.zh-CN.md)：原始碼歸屬及工具設定邊界。
- [貢獻規範（簡體中文）](CONTRIBUTING.zh-CN.md)：檢查、文件及語言同步要求。
- [問題回報](https://github.com/ArsvineZhu/Ripple-Next/issues)：請提供版本、作業系統及重現步驟。

詳細指南目前以英文和簡體中文維護；四種語言的主 README 同步介紹功能、截圖與入門資訊。

## 授權與致謝

Ripple Next 由 [Arsvine Zhu](https://github.com/ArsvineZhu) 在 [TopMyster 的原版 Ripple](https://github.com/TopMyster/Ripple) 基礎上繼續開發，延續靈動島的互動理念，並擁有獨立的產品身分、資料儲存及跨平台整合。採用 [MIT 授權](LICENSE)，保留原專案歸屬。
