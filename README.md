# 爭

法律爭點整理。選一部法律，在裡面記下爭點、相關條文、各家學說與自己的觀點。

## 安裝到 iPhone

1. 用 Safari 打開 <https://lfa-2.github.io/zheng/>
2. 點下方「分享」→「加入主畫面」
3. 之後從主畫面的「爭」圖示開啟，離線也能用（包含查條文）

## 功能

- **法律池**：中華民國憲法（含增修條文）、民法、刑法，以及美國聯邦憲法（英美法）
- **查詢法條**（首頁）：不用先加入法律，直接查整個法律池
  - 條號：`民法184條1項前段`、`Amend. XIV §1`；先選一部法律後也可以只打 `184`
  - 關鍵字：`侵權行為`、`due process`；可在前面加法名縮小範圍，例如 `刑法 公務員`
- **爭點**：爭點名稱、爭點內容、相關條文、學說（一、二、三…可改名，例如「肯定說」）、我的觀點
- **查條文**：在「相關條文」輸入關鍵字即可帶入條文原文，例如
  - `民法184條1項前段`、`民§184Ⅰ前`、`第一百九十一條之一`
  - `刑法第10條第2項第1款`、`憲法增修條文第4條`
  - 一次多條：`民法184條1項、第2項、185`
  - 美國憲法：`Amendment XIV §1`、`U.S. Const. art. I, § 8, cl. 3`、`第一修正案`
- 存下的條文若之後被修正，會提示並可一鍵更新為現行條文

## 條文來源

- 中華民國法規：[全國法規資料庫](https://law.moj.gov.tw/) 開放資料（法務部）
- 美國聯邦憲法：[National Archives](https://www.archives.gov/founding-docs/constitution-transcript)

條文在建置時打包進 App（`public/laws/*.json`），所以查詢不需要連網。GitHub Actions 每週一自動重新抓取，若條文有變動會自動 commit 並重新部署；使用者開 App 時會看到「爭有新版本」，點「立即更新」即可。

## 資料

- 存在裝置本機（`localStorage`，key `zheng-v1`），沒有伺服器、沒有跨裝置同步
- 首頁底部可「匯出備份」（iPhone 上可存到「檔案」）與「匯入備份」

## 開發

```bash
npm install
npm run laws    # 重新抓取條文到 public/laws/
npm run dev     # http://localhost:43127
npm run build   # 輸出靜態檔到 out/，預設 base path 為 /zheng
```

推到 `main` 會自動部署到 GitHub Pages。
