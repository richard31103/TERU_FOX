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

## 8) 表情需求溝通模板（新增 / 沿用 / 替換）

你如果要改角色表情，請直接複製下面模板填空給我：

```text
任務類型：新增表情 / 沿用表情 / 替換表情 / 調整對話表情對應
場景ID：default / park / bed / bed_n / fight
角色：TERU（或其他角色）
對話定位：章節 + 節點ID（或直接貼原始台詞）
觸發時機：進入台詞前 / 打字中(speak) / 台詞結束(idle) / 特殊事件
目標表情鍵：idle / blink / speak / angry / happy / happyTalk / 其他
素材來源：
- 新圖：assets/images/.../xxx.png
- 或沿用：scene.key（例如 default.speak）
變更方式：
- 新增：建立新表情鍵並掛到指定對話
- 沿用：指定沿用哪個既有表情鍵
- 替換：把哪個舊表情鍵改成新素材
回退規則：若素材不存在，請回退到哪個表情（例如 idle）
驗收條件（3-5條）：
1) 哪句台詞要看到哪個表情
2) 眨眼與說話是否正常
3) 切場景後是否維持正確
4) 不能影響既有劇情分支
```

建議：
- 一次只改一組對話區段（先小範圍驗證）
- 新增表情時，請同時說明是否要進預載清單
- 如果你不知道表情鍵名稱，直接貼「台詞 + 想要的情緒」我來幫你映射

## 9) 表情庫實際操作位置（給你自己查）

1. 表情素材主檔
- `src/js/config/expression_library.js`
- 這裡集中管理各場景表情路徑與對話表情集合

2. 場景表情套用
- `src/js/config/scene_assets.js`
- 場景顯示與預載清單會從表情庫取值

3. 對話表情套用
- `src/js/config/runtime_text.js`
- `OPENING_HEADS` / `AFRAID_HEADS` / `SHY_BED_TRANSITION_HEADS` / `HEAD_TOUCH_ASSETS` 由表情庫映射

4. 遊戲執行中的特殊表情
- `src/js/app/game_app.js`
- 特殊事件（例如 money popup、fight 受傷後表情、耳機層）也改為讀取表情庫

## 10) 玩家名字替代文字規範（劇情文案）

這個專案已支援「文案內標記 -> 自動換成玩家名字」。

1. 官方建議標記（未來都用這個）
- `{{player_name}}`

2. 舊標記相容（可用，但不建議新增）
- `{name}`

3. 自動替換範圍
- 一般對話框台詞
- 腳本動態台詞（`runScriptedLine` 路徑）
- 選項標題與選項文字（包含 runtime choice）
- 死亡文字（包含一般死亡與覆寫死亡）
- 語言切換後重新渲染的當前對話

4. 回退規則
- 如果玩家沒有輸入名字，`{{player_name}}` / `{name}` 會自動顯示為：`你`

5. 你未來新增劇情時的寫法範例

```text
{{player_name}}該不會是奇怪的獸控吧？
天氣真好，{{player_name}}想做什麼呢?
床是我的，{{player_name}}去睡沙發!
{{player_name}}被咬死了
```

6. 建議
- 新增文案一律用 `{{player_name}}`，不要混用其他自訂格式
- 一句內可出現多次 `{{player_name}}`，都會被替換

## 11) 爬塔小遊戲（Tower）建置與測試

主遊戲第四選項「和提爾狐爬塔」會載入以下檔案：
- `assets/minigames/tower/tower-game.bundle.js`
- `assets/minigames/tower/tower-game.css`

來源碼在：
- `src/tower_game`

角色素材放置路徑規範：
- 爬塔角色圖統一放在：`assets/images/minigames/tower/Game_TERU.png`
- 未來新增同類素材也放在：`assets/images/minigames/tower/`

武器素材放置路徑規範：
- 正式路徑：`assets/images/minigames/tower/weapons/{sword,bow,wand}/`
- 檔名格式：`{type}_{01..16}.png`（兩位數）
- Staff 素材一律對映到 wand：`Staff 01.png -> wand_01.png`
- 舊根目錄 `weapon/` 不保留，避免重複來源與路徑混用

怪物素材放置路徑規範（Phase 2）：
- 一般怪：`assets/images/minigames/tower/enemies/normal/normal_01..15.png`
- Boss：`assets/images/minigames/tower/enemies/boss/boss_01..10.png`
- 檔名固定兩位數（`01`~`15` / `01`~`10`）
- 怪物不顯示名字，只在 Boss 層顯示 `BOSS` 提示

Boss 出場規則（固定順序）：
- 10 層：`boss_01`
- 20 層：`boss_02`
- ...
- 100 層：`boss_10`
- 超過 100 層後，從 `boss_01` 重新循環

建置流程：

```powershell
cd src/tower_game
npm install
npm run build
cd ../..
```

建置完成後，回主遊戲測試：
1. 開場走到「天氣真好」四選一。
2. 點第四項「和提爾狐爬塔」。
3. 應進入 Tower overlay，可做職業選擇 -> 開局 5 連抽 -> 進入回合戰鬥（Phase 2）。
4. 點「離開爬塔」後要回到開場四選一。

Phase 2 驗收重點：
1. 四職業都可點，數值正確顯示。
2. 5 連抽只會出灰/綠/藍（不會出紫/金）。
3. 戰鬥有四個可用按鈕：攻擊 / 防禦 / 逃跑 / 使用道具。
4. 點「使用道具」會打開道具欄，且顯示「目前沒有道具可使用」。
5. 一般層怪物圖片隨機，且相鄰樓層不會同一張圖。
6. 第 10 / 20 / 30 ... 層會進 Boss，且按 `boss_01`~`boss_10` 固定順序出場。
7. 玩家血量低於 30% 時，血條要轉紅且有呼吸效果。
8. 重新進出爬塔不應殘留上一輪 UI 狀態。

Phase 2 第二次修改驗收重點（不含商店）：
1. 一般怪只會出現 `attack / guard` 意圖；`heavy`（蓄力重擊）只會出現在 Boss。
2. 逃跑會扣除 5% 最大生命，並退回前一層。
3. 逃跑後的前一層屬於追回戰：打贏「不掉落金幣/素材」。
4. 追回戰結束後會回到原本逃跑樓層，且該層怪物會重抽（重新生成）。
5. 既有 Phase 2 功能（四職業、5 抽、四按鈕、低血特效、UI 清理）需持續正常。

Phase 3 驗收重點（屬性與元素反應）：
1. 玩家武器會帶有元素（`水/火/植/光/暗`），且武器格旁有小屬性格（emoji）。
2. 怪物會帶有元素，玩家與敵方卡片都可看到元素與目前狀態。
3. 基礎相剋生效：水剋火、火剋植、植剋水、光暗互剋（+20% / -20%）。
4. 水攻擊可附加「潮濕」；火攻擊可附加「燃燒」並造成每回合扣血。
5. 火打到潮濕目標觸發「蒸發」（該次傷害提升）；植打到潮濕目標觸發「纏繞」（下回合失去行動）。
6. 光/暗攻擊有機率附加「致盲」（下次攻擊落空）。
7. 植屬攻擊可吸血回復，且戰鬥訊息會顯示屬性與反應結果。

臨時測試模式（無敵）：
1. 戰鬥操作區提供 `測試模式：無敵` 勾選框（僅影響 Tower）。
2. 開啟後玩家不會掉血（敵方傷害、燃燒 DOT、逃跑扣血都不扣）。
3. 即使無敵，受擊動畫 / 浮動傷害數字 / 音效仍會播放，方便測試節奏。
4. 離開 Tower 後重新進入，勾選狀態預設為關閉（不持久化）。
5. 正式上線前可移除此開關與對應傷害 guard（`isTestInvincible`）。

Phase 5 測試開關（商店）：
1. 另有兩個商店測試勾選：
   - `測試模式：免費購物`
   - `測試模式：商店無限制`
2. `免費購物` 開啟後，商店購買/刷新/附魔/強化等金幣消耗會變為 0。
3. `商店無限制` 開啟後，常駐/魔法/神秘三商店都可直接開啟（忽略 Boss/觸發條件）。
4. 即使開啟 `商店無限制`，常駐商店「每 5 層一次刷新」限制仍維持。
5. 總開關在 `src/tower_game/src/config/dev_flags.js`：
   - `ENABLE_TOWER_SHOP_TEST_TOOLS = true`：測試期顯示並啟用。
   - 正式版改 `false`：兩個商店測試勾選會隱藏且強制失效。

Phase 4 驗收重點（升級卡片 / Reroll / 雙面刃）：
1. 開局進入戰鬥後，正式可操作前會先跳一次升級三選一；未選卡前戰鬥按鈕鎖定。
2. 一般層擊敗不觸發升級；Boss（10/20/30...）擊敗後，先拿獎勵再跳升級。
3. 升級面板可用 50 金幣重刷候選卡，金幣不足時按鈕禁用；同次可連續重刷。
4. 基礎卡可重複疊加：
   - 攻擊強化：總攻擊提高（面板與實傷同步）。
   - 體魄鍛鍊：MaxHP 與 CurrentHP 同步提高。
   - 鋼化皮甲：常駐減傷可疊加。
5. 詛咒卡可重複疊加：
   - 焦渴之炎：攻擊元素固定火、暴傷 +50%（可疊）、每次攻擊後自損 3% MaxHP（可疊）。
   - 玻璃大砲：造成傷害 x2、承受傷害 x2（可疊乘）。
6. 戰鬥操作區下方可看到當前 Build 摘要與已選卡片堆疊數。
7. 回歸確認：
   - 測試無敵、敵方延遲行動、逃跑追回戰、Phase 3 元素反應仍正常。
   - 離開 Tower 重進後，Build 與開局升級流程會重置（不跨 run 持久化）。

Phase 4.1 驗收重點（特殊怪 `normal_16_S`）：
1. 一般怪池加入 `normal_16_S.png`，且只在一般層出現，不進 Boss 池。
2. 特殊怪抽取採權重 1；一般怪（`normal_01..15`）權重 1。  
   （等機率抽取，共 16 隻一般怪，`normal_16_S` 為 1/16）
3. 一般怪抽取仍維持「相鄰樓層不連續重複同一隻」，包含特殊怪。
4. 擊敗特殊怪時，該場金幣掉落改為 5 倍，戰鬥訊息會顯示特殊掉落提示。
5. 若特殊怪出現在逃跑追回戰，打贏仍不掉落金幣（不套五倍，無掉落優先）。
6. 回歸確認：Boss 掉落、Boss 升級觸發、Phase 3/4 既有流程不受影響。

Phase 5 驗收重點（常駐框格 + 技能實戰 + 商店入庫）：
1. 戰鬥區固定顯示 5 格：`道具 x1`、`技能 x1`、`補品 x2`、`防具 x1`。
2. 商店購買不再只有扣金幣：
   - 武器：直接替換目前主武器。
   - 防具：進防具格（滿格時跳替換視窗）。
   - 補品：2 格可堆疊（滿格時跳替換視窗）。
   - 技能：加入技能清單並可消耗使用。
   - 神秘道具：進道具格（滿格時跳替換視窗）。
3. 技能格可點開技能視窗，會顯示所有已購買技能、效果描述、持有數與「使用技能」按鈕。
4. 技能使用規則：
   - 使用 1 張技能卡 = 1 次行動。
   - 除 `時間暫停` 外，使用後會進入敵方回合。
   - `時間暫停` 開啟後 2 秒內可連點攻擊，時間到才恢復敵方回合。
5. 神秘道具效果驗證：
   - `替身`：致死時改為保留 1 HP 並消耗。
   - `VIP 貴賓卡`：商店價格 8 折。
   - `耳環`：提高特殊怪與神秘商店觸發機率。
   - `點滴`：每 10 秒回復 1% MaxHP（戰鬥中）。
   - `武器交換` / `不知名的藥` / `搶劫`：可由道具格使用，觸發一次性效果。
6. 商店彈窗與戰鬥鎖定：
   - 商店彈窗、技能視窗、替換視窗開啟時，戰鬥主按鈕鎖定。
   - 關閉視窗後恢復操作。
7. 回歸確認：
   - 無敵、免費購物、商店無限制仍可用。
   - Phase 2 逃跑追回戰、Phase 3 元素反應、Phase 4 升級卡片與雙面刃不回歸。
8. 仍須在每次修改後重跑：
   - `cd src/tower_game && npm run build`
   - 讓 `assets/minigames/tower/*` 產出同步更新。

Phase 5 UI/UX A 驗收重點（戰鬥介面中度重排）：
1. 戰鬥畫面分為三層：狀態層（玩家/敵人卡）-> 指令層（攻防逃與商店）-> 資源層（槽位/訊息/Build）。
2. 「攻擊/防禦/逃跑/使用道具」與「三商店」分成兩排，避免操作混雜。
3. 狀態 chip 分兩群顯示：
   - `核心進度`：樓層、金幣、Boss、特殊怪、追回戰、神秘商店狀態。
   - `暫停/鎖定`：敵方行動、升級選擇、各類視窗開啟、時間暫停、攻擊增益。
4. 測試開關改為「開發工具」折疊區：
   - 預設收合。
   - 展開後可切換無敵 / 免費購物 / 商店無限制（後兩者仍受 dev flag 控制）。
5. 戰鬥鎖定提示：
   - 任一鎖定狀態時（敵方行動、升級、商店、技能、替換），顯示 `操作鎖定` 原因文案。
6. 戰鬥訊息區：
   - 保留當前 `battleNotice`。
   - 新增最近 5 則訊息 history，最新訊息排第一。
7. 視窗一致性：
   - 商店 / 技能 / 替換 modal 統一為 `header + scroll content + footer` 佈局。
   - 開窗時保持戰鬥按鈕鎖定，關窗後恢復。
8. 回歸檢查：
   - Phase 2~5 既有戰鬥規則與數值不變。
   - 僅調整 UI/UX 與互動提示，不更動傷害/掉落計算。

## Phase 5.2 驗收補充（Draft Focus + 背景整理 + 服務視窗）

### A. 三選一卡片聚焦（Draft Focus）
1. 開局升級與 Boss 後升級時，戰鬥區進入卡片聚焦模式。
2. 聚焦期間只保留上方玩家/敵人狀態卡與升級面板。
3. 聚焦期間隱藏：攻防逃按鈕、商店按鈕、5 格槽位、Build 摘要、訊息歷史、開發工具。
4. 選卡完成後恢復完整戰鬥介面。

### B. Tower 背景資產
1. 背景圖已整理到：`assets/images/minigames/tower/backgrounds/bg_global_tower_main_v01.jpg`。
2. 場景映射檔：`src/tower_game/src/data/tower_scene_assets.js`。
3. 命名規則固定：`bg_{scope}_{theme}_v{nn}.{ext}`。
4. `scope` 可用：`global | class | gacha | battle | shop | boss`。

### C. 附魔/強化專屬視窗
1. 點擊附魔/強化後，先開預覽視窗，不會立即扣金。
2. 附魔顯示：目前元素 -> 候選元素、金幣前後、對當前敵人的屬性加成變化。
3. 強化顯示：Base/Effective 攻擊前後與差值、金幣前後。
4. `確認` 才扣金並套用；`取消` 不變更。
5. 預覽已鎖定，同一視窗內確認不會重新隨機。
