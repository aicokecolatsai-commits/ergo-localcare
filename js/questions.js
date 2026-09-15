/**
 * 人因工程「身體伺服器」題庫與計分模型 (questions.js)
 * 涵蓋四大族群：上班族、學生、久站服務、重複操作
 * 採用 NMQ-Lite (40%) + 工作站環境 (30%) + 行為重啟 (30%) 滿分 100 分扣分制
 */

const ERGO_CONFIG = {
  roles: [
    {
      id: "office",
      name: "💼 職場辦公室戰士",
      desc: "專注於電腦工位、雙螢幕、筆電出差與長時間會議",
      badge: "辦公室久坐"
    },
    {
      id: "student",
      name: "🎓 課堂刷題學霸",
      desc: "專注於教室木椅、補習班自習、平板筆記與電競遊戲",
      badge: "課堂學生/考生"
    },
    {
      id: "standing",
      name: "🏪 走動久站達人",
      desc: "專注於專櫃零售、餐飲服務、護理醫療與巡檢作業",
      badge: "久站/服務業"
    },
    {
      id: "technician",
      name: "🏭 重複操作/技術職",
      desc: "專注於產線組裝、倉儲搬運、數位繪師、剪輯與維修",
      badge: "重複性/技術職"
    }
  ],

  // 各族群專屬題庫 (每族群 8 題)
  questionSets: {
    office: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "後頸肩胛",
        question: "1. 連續盯螢幕工作 2 小時後，你的後頸與雙肩感受是？",
        options: [
          { label: "A. 輕鬆無感，轉動順暢靈活", penalty: 0 },
          { label: "B. 像背了重背包，緊繃沈重", penalty: 5 },
          { label: "C. 僵硬刺痛，甚至引發後腦勺緊縮偏頭痛", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "back",
        dimensionName: "腰椎骨盆",
        question: "2. 長時間坐在辦公椅上，你的下背與尾椎狀態如何？",
        options: [
          { label: "A. 支撐良好，坐整天沒有明顯酸痛", penalty: 0 },
          { label: "B. 站起來時腰部緊繃，需要扶腰伸展才舒服", penalty: 5 },
          { label: "C. 坐立難安、深層酸痛或延伸到臀部腿部", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "wrist",
        dimensionName: "手腕手肘",
        question: "3. 敲鍵盤、點滑鼠時，你的手部與手腕有什麼感覺？",
        options: [
          { label: "A. 靈活輕鬆，毫無壓迫感", penalty: 0 },
          { label: "B. 手腕內側壓痕發紅、手掌偶爾微麻", penalty: 5 },
          { label: "C. 手腕外側或手肘明顯酸痛（滑鼠手/網球肘症狀）", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "視覺與大腦",
        question: "4. 下午 3 點過後，你的視覺與大腦專注力狀態？",
        options: [
          { label: "A. 視線清晰，精力平穩輸出", penalty: 0 },
          { label: "B. 眼睛乾澀疲勞、需要用力瞇眼看字", penalty: 5 },
          { label: "C. 視線模糊對焦慢、大腦當機昏沉", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "螢幕視角",
        question: "5. 眼睛自然平視前方時，你的視線落在螢幕哪個位置？",
        options: [
          { label: "A. 落在螢幕上緣 1/3 處（自然平視無負擔）", penalty: 0 },
          { label: "B. 落在螢幕正中間（略微低頭）", penalty: 5 },
          { label: "C. 視線由上往下看（筆電直接放桌上，極度低頭烏龜頸）", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "腰手支撐",
        question: "6. 打字時，你的手肘與腰部的支撐配置是？",
        options: [
          { label: "A. 手肘有桌子或扶手良好承托（90度），腰有腰靠貼合", penalty: 0 },
          { label: "B. 手肘懸空打字，或椅子沒有腰靠（駝背懸空）", penalty: 5 },
          { label: "C. 整個人癱陷在軟椅，或手腕死壓在尖銳桌緣", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "環境眩光",
        question: "7. 你的螢幕上是否看得到頭頂燈具或窗戶的反光？",
        options: [
          { label: "A. 幾乎無反光，光線柔和舒適", penalty: 0 },
          { label: "B. 有輕微反光或刺眼，但習慣了", penalty: 5 },
          { label: "C. 反光嚴重，常因眩光歪頭或瞇眼閃光", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "連續久坐",
        question: "8. 工作時，你通常「連續坐著不動」多久才離開座位？",
        options: [
          { label: "A. 45~60 分鐘內必定會站起來裝水、上廁所或走動", penalty: 0 },
          { label: "B. 專注時約 1.5 ~ 2 小時動一次", penalty: 15 },
          { label: "C. 常常一坐 3~4 小時以上，直到被膀胱或會議打斷", penalty: 30 }
        ]
      }
    ],

    student: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "後頸肩胛",
        question: "1. 在教室或晚自習連續讀書 2 小時後，脖子與肩膀感覺如何？",
        options: [
          { label: "A. 輕鬆舒服，轉頭沒有卡卡的感覺", penalty: 0 },
          { label: "B. 後頸沉重發緊，不自覺想用力扭動脖子", penalty: 5 },
          { label: "C. 脖子僵硬如鐵，甚至引起後腦勺脹痛、頭暈", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "back",
        dimensionName: "腰椎骨盆",
        question: "2. 坐在學校硬木椅或補習班椅子上，腰背部有何感受？",
        options: [
          { label: "A. 坐得住，背部不會酸軟", penalty: 0 },
          { label: "B. 坐久了腰很空虛酸痛，身體會一直往前滑癱坐", penalty: 5 },
          { label: "C. 尾椎或腰部劇烈酸麻，一定要換成盤腿或翹腳才行", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "wrist",
        dimensionName: "手腕手部",
        question: "3. 刷題寫筆記、滑手機或打手遊時，手部與手腕感覺？",
        options: [
          { label: "A. 手部活動自如，寫字打字很輕鬆", penalty: 0 },
          { label: "B. 握筆中指長厚繭疼痛，或大拇指根部發酸", penalty: 5 },
          { label: "C. 手腕手掌發麻無力，或手腕外側關節卡痛", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "視覺與大腦",
        question: "4. 連續讀書或看平板一段時間後，你的視覺與專注力？",
        options: [
          { label: "A. 視線清爽，記憶力與專注度穩定", penalty: 0 },
          { label: "B. 眼睛乾澀酸脹、字體開始有些模糊", penalty: 5 },
          { label: "C. 眼前發花、眼眶脹痛、極度嗜睡無法思考", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "視角與讀書角度",
        question: "5. 你平常讀書、寫字或看平板時，視線角度是？",
        options: [
          { label: "A. 有使用讀書立架，課本立起自然平視（視線平視）", penalty: 0 },
          { label: "B. 課本平放桌面，頭部持續微低頭（45度角）", penalty: 5 },
          { label: "C. 整個人趴在桌上、單手托腮歪頭寫字看書", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "座椅與雙腳",
        question: "6. 在課桌椅坐下時，你的雙腳與腰部狀態？",
        options: [
          { label: "A. 雙腳能平踏地面，背部有自然靠著", penalty: 0 },
          { label: "B. 雙腳懸空或只能踩在椅槓上，腰部完全懸空", penalty: 5 },
          { label: "C. 習慣翹二郎腿、盤腿坐在椅子上，或單邊歪坐", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "照明與影子",
        question: "7. 讀書寫字時，桌面照明是否受到身體陰影或眩光干擾？",
        options: [
          { label: "A. 光線均勻明亮，寫字時沒有討厭的手部陰影", penalty: 0 },
          { label: "B. 光線偏暗或寫字時有手影遮住字體", penalty: 5 },
          { label: "C. 頂燈刺眼反光嚴重，或常在昏暗環境看手機/平板", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "下課重啟",
        question: "8. 下課 10 分鐘或念書段落休息時，你通常做什麼？",
        options: [
          { label: "A. 站起來走動裝水、望向遠處放鬆眼睛", penalty: 0 },
          { label: "B. 坐在原位不動，低頭繼續滑手機或打手遊", penalty: 15 },
          { label: "C. 直接把頭壓在手臂上趴睡（壓迫眼球與頸椎扭轉）", penalty: 30 }
        ]
      }
    ],

    standing: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "後頸肩胛",
        question: "1. 站立值班服務數小時後，肩膀與後頸部的感覺？",
        options: [
          { label: "A. 輕鬆自如，無緊繃感", penalty: 0 },
          { label: "B. 聳肩緊繃、肩頸僵硬沈重", penalty: 5 },
          { label: "C. 肩胛骨內側劇烈刺痛、頸椎轉動受限", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "back",
        dimensionName: "腰背足底",
        question: "2. 長時間站立或走動後，下背部與腳底板的反應？",
        options: [
          { label: "A. 雙腳與腰部良好，下班後無酸麻", penalty: 0 },
          { label: "B. 腰部挺立發酸，腳後跟或腳底隱隱作痛", penalty: 5 },
          { label: "C. 足底刺痛（足底筋膜炎痛感）、腰椎像要斷掉一樣", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "wrist",
        dimensionName: "下肢靜脈",
        question: "3. 值班結束脫下鞋襪時，小腿與下肢的狀態？",
        options: [
          { label: "A. 雙腿輕盈，無腫脹感", penalty: 0 },
          { label: "B. 小腿明顯緊繃水腫、襪痕深刻", penalty: 5 },
          { label: "C. 小腿青筋浮現（靜脈曲張）、夜間容易抽筋", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "體力續航",
        question: "4. 連續站立作業半天後，整體體力與專注度狀態？",
        options: [
          { label: "A. 精神充沛，應對流暢", penalty: 0 },
          { label: "B. 感到身心疲憊，需要靠意志力支撐笑容", penalty: 5 },
          { label: "C. 全身虛脫、專注力下降容易發生服務/操作失誤", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "櫃檯高度",
        question: "5. 你的工作櫃檯/收銀機/操作台高度與手肘位置？",
        options: [
          { label: "A. 操作台面剛好在手肘下方 5~10 公分（手臂自然放鬆）", penalty: 0 },
          { label: "B. 台面偏低，需要經常彎腰操作", penalty: 5 },
          { label: "C. 台面太高（需聳肩）或太低（需長時間彎腰前傾）", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "鞋具與地面",
        question: "6. 站立時所穿的鞋子與地面緩衝配置？",
        options: [
          { label: "A. 穿著具良好足弓支撐與減震鞋墊的機能鞋，地面有減震墊", penalty: 0 },
          { label: "B. 普通平底鞋或硬底鞋，直接站在硬質磁磚/水泥地上", penalty: 5 },
          { label: "C. 需穿著高跟鞋或薄底硬鞋久站，無任何減震墊", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "站姿重心習慣",
        question: "7. 當你需要定點站立時，你的站姿習慣是？",
        options: [
          { label: "A. 雙腳微開與肩同寬，核心微收，重心平均分佈", penalty: 0 },
          { label: "B. 習慣把重心全部放在單腳（三七步）或肚子往前挺", penalty: 5 },
          { label: "C. 習慣靠在櫃檯上、駝背側傾站立", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "換姿與微坐重啟",
        question: "8. 值班期間，你有機會坐下或抬腿微休息嗎？",
        options: [
          { label: "A. 每 1~2 小時有機會坐下 3~5 分鐘微放鬆下肢", penalty: 0 },
          { label: "B. 連續站立 3~4 小時才能坐下休息一次", penalty: 15 },
          { label: "C. 全天幾乎無法坐下，連續站立 6 小時以上", penalty: 30 }
        ]
      }
    ],

    technician: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "後頸肩胛",
        question: "1. 進行高精細操作、繪圖或組裝時，肩頸部的負荷感受？",
        options: [
          { label: "A. 肩部放鬆無負擔", penalty: 0 },
          { label: "B. 肩頸肌肉長時間持續收縮緊繃", penalty: 5 },
          { label: "C. 單側肩膀劇痛、手臂抬起時有卡頓疼痛感", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "back",
        dimensionName: "腰背負載",
        question: "2. 搬運物件或長時間維持固定作業姿勢後，腰部狀態？",
        options: [
          { label: "A. 腰背有力，無疲倦酸痛", penalty: 0 },
          { label: "B. 下班時腰部僵硬，彎腰有酸痛感", penalty: 5 },
          { label: "C. 曾有急性閃腰或經常性下背深層抽痛", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "wrist",
        dimensionName: "手指手腕",
        question: "3. 長時間握工具/數位筆或重複施力，手部肌肉關節感受？",
        options: [
          { label: "A. 握力充足，手指手腕靈活無痛", penalty: 0 },
          { label: "B. 手指關節酸脹、手腕內外側壓痛", penalty: 5 },
          { label: "C. 扳機指（手指卡住彈響）、手腕劇痛（肌腱炎/網球肘）", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "精細視覺疲勞",
        question: "4. 長時間注視精細零件、線稿或螢幕細節後？",
        options: [
          { label: "A. 視力保持清晰敏銳", penalty: 0 },
          { label: "B. 眼睛發熱乾澀、看遠方需數秒重新對焦", penalty: 5 },
          { label: "C. 嚴重眼脹、頭痛，看細節出現重影", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "視距與作業角度",
        question: "5. 你的操作工作區或數位繪圖板的擺放角度？",
        options: [
          { label: "A. 具備適當傾角（30~45度），視線與作業面垂直舒適", penalty: 0 },
          { label: "B. 平放於桌面，需稍微低頭並伸長脖子作業", penalty: 5 },
          { label: "C. 完全平放或需極端側身操作，頭頸大幅前傾扭轉", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "工具握柄",
        question: "6. 你平常使用的手工具/筆具的握柄人因狀況？",
        options: [
          { label: "A. 握柄粗細適中、有防滑減震包覆，省力順手", penalty: 0 },
          { label: "B. 握柄偏細或硬質塑料，需用較大力氣夾握", penalty: 5 },
          { label: "C. 握柄震動大、邊緣銳利，長期壓迫手掌神經與血管", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "搬運重物力矩",
        question: "7. 搬運重物或工具箱時，你的身體姿勢習慣是？",
        options: [
          { label: "A. 屈膝下蹲，將物品緊貼胸口再用大腿力量站起", penalty: 0 },
          { label: "B. 常常貪快直接彎腰（膝蓋伸直）搬起物品", penalty: 5 },
          { label: "C. 彎腰同時進行身體扭轉搬重物（椎間盤高危動作）", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "微放鬆循環",
        question: "8. 重複性作業時，你是否會進行「反向拉伸」放鬆？",
        options: [
          { label: "A. 每 30~45 分鐘會主動進行 20 秒反向拉伸甩手放鬆", penalty: 0 },
          { label: "B. 只有累到手酸手麻時才停下來甩一甩", penalty: 15 },
          { label: "C. 連續趕工數小時不停歇，直到任務結束才癱軟", penalty: 30 }
        ]
      }
    ]
  },

  scoreTiers: [
    {
      min: 85,
      max: 100,
      tier: "tier_green",
      title: "🟢【頂級旗艦伺服器】",
      subtitle: "高算力 / 極低折舊率優等生",
      statusColor: "#10b981",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      analysis: "太棒了！你的身體伺服器硬體維護極佳，各部件力矩平衡良好，每天幾乎沒有因物理疲勞損耗的精力漏水。",
      prescriptions: [
        "維持現狀：保持定時中斷與良好的視線高度習慣。",
        "進階外掛：可推廣你的工作站配置給身邊同事/同學，成為人因標竿。",
        "護眼微節奏：持續落實「20-20-20 原則」（看 20 呎外 20 秒）。"
      ]
    },
    {
      min: 70,
      max: 84,
      tier: "tier_yellow",
      title: "🟡【散熱不良輕度警示】",
      subtitle: "局部零件微發炎 / 算力流失約 15%",
      statusColor: "#f59e0b",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      analysis: "系統運作大致正常，但局部零件（如後頸或手腕）已經出現散熱不良與微發炎。每天下午有約 15% 的專注力正在被隱形酸痛偷偷吃掉。",
      prescriptions: [
        "視線力矩歸零：請立即將螢幕/筆電墊高 8~10 公分，讓上緣平視眼睛。",
        "手腕減壓外掛：打字時手肘必須有支撐（90度），嚴禁手腕死壓在桌緣。",
        "小水杯助推法：把 1000ml 大水壺換成 250ml 小杯子，強制每小時起立走動。"
      ]
    },
    {
      min: 50,
      max: 69,
      tier: "tier_orange",
      title: "🟠【算力漏水過載中】",
      subtitle: "CPU 降頻中 / 每天偷走 30% 產能",
      statusColor: "#f97316",
      badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
      analysis: "高風險警訊！你的身體伺服器正處於「帶傷上陣」的超載降頻狀態。下午效率變差不是意志力問題，而是骨盆與肩頸在瘋狂向大腦搶奪算力。",
      prescriptions: [
        "外套壽司捲腰靠：將厚外套捲成圓柱狀塞在腰椎凹槽，立刻卡正骨盆分散 40% 壓力。",
        "徹底告別低頭筆電：絕對禁止直接將筆電平放桌上打字超過 1 小時，請務必外接鍵盤與支架。",
        "站立溝通習慣：5 分鐘以內的對齊工作或講電話，一律站著完成。"
      ]
    },
    {
      min: 0,
      max: 49,
      tier: "tier_red",
      title: "🔴【瀕臨當機緊急進廠】",
      subtitle: "重大硬體危機 / 累積結構性傷害",
      statusColor: "#ef4444",
      badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/40",
      analysis: "緊急警報！你的肌肉骨骼系統已產生不可忽視的代價，身體折舊率爆表。若不及時止損，每年將付出龐大的醫療成本與不可逆的健康損失。",
      prescriptions: [
        "全面環境重構：今天下班/放學後，立刻把工作桌椅重新依「手肘90度、視線平視、雙腳著地」三個標準全面調整。",
        "硬性中斷鬧鐘：下載番茄鐘或定時器，設定 45 分鐘一響，無論多忙都必須離開椅子 60 秒。",
        "尋求專業協助：若手麻、刺痛或下背深層抽痛持續超過兩週，請及早諮詢復健科或物理治療師。"
      ]
    }
  ]
};

if (typeof window !== "undefined") {
  window.ERGO_CONFIG = ERGO_CONFIG;
}
