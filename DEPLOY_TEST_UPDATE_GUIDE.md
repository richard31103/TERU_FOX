# TERU_FOX 部署後測試與更新操作手冊（新手版）

本文件是給第一次接手專案的人用的。  
重點目標：你改了劇情或圖片後，可以快速確認結果，同時不影響正式玩家體驗。

## 1) 目前已生效的機制（先理解）

1. 圖片快取規則（Vercel）
- 只套用在 `/assets/images/*`
- 快取標頭：`public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`
- 代表正式站圖片可能最多有約 1 小時快取延遲

2. 開發期自動版本參數（只影響測試環境）
- 在 `localhost` 或 Vercel Preview（`-git-*.vercel.app`）時，圖片 URL 會自動加上 `__devv=...`
- 這可以避免你測試時一直吃到舊圖
- 正式玩家環境預設不會加這個參數

3. 圖片壓縮工具
- 壓縮腳本：`tools/compress_images.mjs`
- 操作說明：`tools/image_compression.md`

## 2) 每次部署後，建議照這個順序測試

1. 先測 Vercel Preview（不要先看 Production）
- 打開本次 commit 對應的 Preview URL
- 進入遊戲，走一次主要流程：標題 -> 開始 -> 場景切換 -> 戰鬥/bed 相關畫面

2. 檢查是否拿到新版圖片
- 開 DevTools -> Network -> 找任一 `assets/images/...` 請求
- 在 Preview/localhost 預期會看到 URL 含 `__devv=...`

3. 檢查快取標頭（確認部署設定正確）
- 指令：

```powershell
curl -I "https://<你的網域>/assets/images/scenes/default/bg-main.jpg"
```

- 預期看到：

```text
Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400
```

4. 最後再測 Production
- 同樣走一次主要流程
- 若你剛更新圖片，Production 可能在 1 小時內逐步更新，屬正常行為

## 3) 1 小時內改了素材，想立刻確認怎麼做

1. 最快做法（推薦）
- 直接看 Preview URL（通常比 Production 更快看到新內容）

2. 在瀏覽器強制不吃快取
- DevTools -> Network -> 勾選 `Disable cache`
- 重整頁面（建議 Hard Reload）

3. 臨時強制開啟版本參數
- 在 Console 輸入：

```js
localStorage.setItem('dev_asset_versioning', 'on');
location.reload();
```

## 4) 手動開關指令（Console）

1. 強制開啟版本參數（測試新圖）

```js
localStorage.setItem('dev_asset_versioning', 'on');
location.reload();
```

2. 強制關閉版本參數（模擬正式玩家）

```js
localStorage.setItem('dev_asset_versioning', 'off');
location.reload();
```

3. 回到自動判斷模式（建議平常用這個）

```js
localStorage.removeItem('dev_asset_versioning');
location.reload();
```

4. 查看目前手動模式值

```js
localStorage.getItem('dev_asset_versioning');
```

## 5) 你之後加劇情、加圖片時的注意事項

1. 新增圖片檔案位置
- 請放在 `assets/images/...`
- 這樣才會吃到統一快取規則與版本參數機制

2. 在設定檔加圖片路徑時
- `src/js/config/scene_assets.js` 裡的場景與預載清單，已經會自動套版本參數（開發期）
- `src/js/config/runtime_text.js` 中「作為圖片路徑」的常數，請維持使用 `withAssetVersion(...)` 包住路徑

3. 在其他 JS 新增硬編碼圖片路徑時
- 請 import 並使用：

```js
import { withAssetVersion } from '../config/asset_versioning.js';
const asset = withAssetVersion('assets/images/xxx.png');
```

4. 在 HTML 新增 `<img src="assets/images/...">` 或 `<source srcset="assets/images/...">`
- 現有機制會在開發期自動改寫版本參數

5. 若你新增的是 CSS 裡的 `background-image: url(assets/images/...)`
- 不一定會被自動改寫（目前只特別處理了 title/splash）
- 建議改成由 JS 動態設定，並走 `withAssetVersion(...)`

6. 正式站急著更新圖片時
- 因有 1 小時快取，最保險做法是改檔名（例如 `bg-main-v2.jpg`）並更新引用路徑

## 6) 發版前建議 Checklist

1. 圖片改過就先壓縮

```powershell
node tools/compress_images.mjs --dry-run
node tools/compress_images.mjs
```

2. 若壓縮工具沒裝

```powershell
cd .img-tools
npm install
cd ..
```

3. 推送後先驗 Preview，再驗 Production

4. 驗證快取標頭與主要遊戲流程（避免只看首頁）


## 7) 跟 Codex 高效溝通模板（可直接複製貼上）

每次要我改功能、加圖片、加劇情，請直接貼下面這段再填空：

```text
任務類型：新增劇情 / 新增場景 / 改圖 / 新增選項
目標：我要玩家看到什麼變化
資產清單：檔名 + 路徑 + 用在哪裡
劇情流程：從哪一行開始 -> 選項 -> 跳到哪裡
文案語言：tw / en / jp 哪些要改
限制：不要改哪些檔、不要動哪些功能
驗收條件：我如何判斷完成（3-5條）
執行方式：先給方案不改檔 / 直接實作
```

建議：
- 一次只做一個小目標（例如先加一段劇情，再加圖片）
- 如果你不確定路徑，就先說「我要放在哪個場景」讓我幫你定路徑
- 如果是緊急修 bug，第一句先寫「這是 hotfix」
