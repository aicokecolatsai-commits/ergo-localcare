# Firebase 預覽測試

此串接只啟用於 Firebase Hosting 的獨立預覽通道。學員匿名送出至 `previewSessions`，講師需以 Google 登入並在 `previewAdmins` 名單中，才能查看看板或匯出 CSV。這個預覽通道不應收集真實個人或健康資料，也不會修改既有 Google 試算表。

預覽停用試算表同步、模擬資料及清空操作；原先瀏覽器本機紀錄不會自動移入雲端。提交逾時可能稍後送達，畫面會提示先向講師確認，避免重複送出；目前沒有自動補送功能。預覽未設定 App Check、濫用防護、正式資料保留與刪除流程，不能當正式服務使用。

## 測試及產生預覽

準備 Firebase CLI、Java 21、Node.js，並在專案外安裝 `firebase@11` 與 `@firebase/rules-unit-testing@4`，設定 `NODE_PATH` 指向該 `node_modules`。使用 `firebase emulators:exec --only firestore --project demo-ergo-localcare "node tests/firestore-rules.cjs"` 執行權限與即時監聽測試，測試只使用模擬器。

執行 `python scripts/build-firebase-preview.py <專案外的新資料夾>`，再以該資料夾的 `firebase.json` 執行 `firebase hosting:channel:deploy mobile-preview --expires 7d --project ergo-localcare-20261028 --config <建置資料夾>/firebase.json`。此流程只更新預覽通道，不是正式站發布；Firebase SDK 設定由 Hosting 提供，未將 API Key 寫入原始碼。

`firestore.rules` 僅保護預覽集合。部署規則會影響指定 Firebase 專案的整個 Firestore 規則集，務必先核對專案及既有規則，不可直接套用到其他專案。
