# Firebase 預覽測試

此串接只啟用於 Firebase Hosting 的獨立預覽通道。學員匿名送出至 `previewSessions`，講師需以 Google 登入並在 `previewAdmins` 名單中，才能查看看板或匯出 CSV。這個預覽通道不應收集真實個人或健康資料，也不會修改既有 Google 試算表。

預覽停用試算表同步、模擬資料及清空操作；原先瀏覽器本機紀錄不會自動移入雲端。提交未確認時會逐筆保留於該裝置，恢復連線或重新開啟頁面後重試；待送期間不可清除瀏覽器資料。同一筆重送只能寫入完全相同內容；若匿名身分消失、本機儲存受限或資料毀損，需聯絡講師，無法保證補送。舊版瀏覽器若不支援 Web Locks，將保留待送資料並請使用者聯絡講師，不會自行補送。此功能不等於網站可完整離線開啟。預覽未設定 App Check、濫用防護、正式資料保留與刪除流程，不能當正式服務使用。

## 測試及產生預覽

準備 Firebase CLI、Java 21、Node.js，並在專案外安裝 `firebase@11` 與 `@firebase/rules-unit-testing@4`，設定 `NODE_PATH` 指向該 `node_modules`。使用 `firebase emulators:exec --only firestore --project demo-ergo-localcare "node tests/firestore-rules.cjs"` 執行權限與即時監聽測試，測試只使用模擬器。

本機瀏覽器斷線測試另使用 `tests/offline-retry.cjs`，需先啟動 Auth 與 Firestore 模擬器並由本機測試伺服器載入預覽設定；測試明確拒絕非本機網址。

執行 `python scripts/build-firebase-preview.py <專案外的新資料夾>`，再以該資料夾的 `firebase.json` 執行 `firebase hosting:channel:deploy mobile-preview --expires 7d --project ergo-localcare-20261028 --config <建置資料夾>/firebase.json`。此流程只更新預覽通道，不是正式站發布；Firebase SDK 設定由 Hosting 提供，未將 API Key 寫入原始碼。

使用者選擇目前先保留正式資料，不設定自動刪除。`firestore.rules` 僅保護預覽集合。部署規則會影響指定 Firebase 專案的整個 Firestore 規則集，務必先核對專案及既有規則，不可直接套用到其他專案。
