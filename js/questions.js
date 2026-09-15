/**
 * 人因工程評估題庫與計分模型 (questions.js)
 * 基於北歐肌肉骨骼問卷 (NMQ) 與職場生物力學人因工程規範
 * 評分架構：NMQ-Lite 肌肉骨骼負載 (40%) + 工作站環境配置 (30%) + 作業重啟行為 (30%)
 */

const ERGO_CONFIG = {
  roles: [
    {
      id: "office",
      seq: "01",
      icon: "💻",
      name: "辦公室電腦作業族",
      subtitle: "雙螢幕・筆電・文書數據處理",
      desc: "每日電腦作業超過 6 小時，常見前傾伸頸（烏龜頸）、滑鼠手腕壓迫與久坐腰臀酸麻。",
      badge: "久坐 / 螢幕作業",
      morandi: {
        color: "#1d4e73",
        border: "#7eaecb",
        hoverBorder: "#2d6994",
        bg: "linear-gradient(135deg, #d3e5f2 0%, #e8f2f9 100%)",
        badgeBg: "#b8d5ec",
        badgeText: "#0b2942",
        seqColor: "#1d4e73",
        titleColor: "#071d30",
        descColor: "#183c59"
      }
    },
    {
      id: "student",
      seq: "02",
      icon: "🎓",
      name: "學生與長時間研讀族",
      subtitle: "課桌椅書寫・平板自習・考試備考",
      desc: "長時間低頭視角過低、伏案書寫與背負重物，肩胛骨縫膏肓緊繃與下背支撐不足。",
      badge: "課堂 / 考生自習",
      morandi: {
        color: "#245735",
        border: "#80bf97",
        hoverBorder: "#327848",
        bg: "linear-gradient(135deg, #d1ebd8 0%, #e7f5ec 100%)",
        badgeBg: "#b2dfc0",
        badgeText: "#0a2e16",
        seqColor: "#245735",
        titleColor: "#06210f",
        descColor: "#154224"
      }
    },
    {
      id: "standing",
      seq: "03",
      icon: "🧍",
      name: "站立與移動服務族",
      subtitle: "門市專櫃・餐飲醫療・現場巡檢",
      desc: "每日站立走動逾 4 小時，腰椎持續承受重力剪力，下肢循環受阻、膝關節微彎與足底疲累。",
      badge: "久站 / 走動作業",
      morandi: {
        color: "#6e4308",
        border: "#dfb679",
        hoverBorder: "#996515",
        bg: "linear-gradient(135deg, #fae4be 0%, #fbf1de 100%)",
        badgeBg: "#f2d299",
        badgeText: "#452903",
        seqColor: "#6e4308",
        titleColor: "#2b1901",
        descColor: "#4d330f"
      }
    },
    {
      id: "technician",
      seq: "04",
      icon: "⚙️",
      name: "技術操作與重複施力族",
      subtitle: "產線組裝・倉儲搬運・設備檢修",
      desc: "頻繁重複性手部動作、特定手腕扭力或重物搬運，上肢前臂肌肉高張力與下背力矩過大。",
      badge: "重複操作 / 搬運",
      morandi: {
        color: "#7a2333",
        border: "#e29aa6",
        hoverBorder: "#a8394e",
        bg: "linear-gradient(135deg, #f7d4da 0%, #fbe8eb 100%)",
        badgeBg: "#efb8c2",
        badgeText: "#470f1a",
        seqColor: "#7a2333",
        titleColor: "#2e070e",
        descColor: "#541c25"
      }
    }
  ],

  // 各族群專屬題庫 (每族群 8 題)
  questionSets: {
    office: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "頸肩部負荷",
        question: "1. 連續使用電腦工作 2 小時後，頸部與雙肩的感受通常是？",
        options: [
          { label: "A. 輕鬆無緊繃感，轉動自如", penalty: 0 },
          { label: "B. 後頸明顯緊繃沉重，不自覺想揉捏肩膀", penalty: 5 },
          { label: "C. 僵硬刺痛，甚至牽引至後腦勺引起緊縮感或頭痛", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "back",
        dimensionName: "腰背部支撐",
        question: "2. 長時間坐在辦公椅上，下背與腰部的反應是？",
        options: [
          { label: "A. 支撐良好，工作整天無顯著酸痛", penalty: 0 },
          { label: "B. 站立時腰部僵硬發緊，需要伸展或扶腰緩解", penalty: 5 },
          { label: "C. 難以維持正坐、深層酸痛，甚至傳導至臀部或腿部", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "wrist",
        dimensionName: "腕部與手肘",
        question: "3. 敲擊鍵盤與操作滑鼠時，手部末端的感受是？",
        options: [
          { label: "A. 靈活輕鬆，關節活動無阻力", penalty: 0 },
          { label: "B. 手腕內側接觸桌緣處有壓迫紅印、手掌偶發酸脹", penalty: 5 },
          { label: "C. 手腕外側、大拇指根部或手肘外側顯著酸痛、發麻", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "視覺與專注力",
        question: "4. 下午工作一段時間後，眼睛與專注力狀態通常為？",
        options: [
          { label: "A. 視線清晰舒適，專注度平穩維持", penalty: 0 },
          { label: "B. 眼睛乾澀疲倦，需用力眨眼或調整螢幕亮度", penalty: 5 },
          { label: "C. 視線模糊對焦遲緩、眼眶周圍脹痛、注意力難以集中", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "螢幕視角配置",
        question: "5. 正常坐姿平視前方時，您的自然視線落在主要螢幕的哪個位置？",
        options: [
          { label: "A. 視線自然平視落在螢幕上緣 1/3 處（頭部保持水平）", penalty: 0 },
          { label: "B. 落在螢幕正中間（需要略微低頭）", penalty: 5 },
          { label: "C. 視線明顯由上往下俯視（筆電直接平放桌面，頸椎深度前傾）", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "工作姿態支撐",
        question: "6. 輸入文字與操作滑鼠時，手臂手肘與腰椎的支撐配置？",
        options: [
          { label: "A. 手肘有扶手或桌面良好承托（約90度），腰椎有靠背貼合", penalty: 0 },
          { label: "B. 手肘懸空操作，或椅背無足夠腰靠支撐（軀幹懸空）", penalty: 5 },
          { label: "C. 軀幹癱陷在椅內、腰椎懸空，或手腕硬壓在銳利桌緣", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "工作站光環境",
        question: "7. 您的螢幕表面是否受到頂燈反光或窗戶刺眼眩光干擾？",
        options: [
          { label: "A. 幾乎無反光，光線均勻柔和", penalty: 0 },
          { label: "B. 存在輕微反光或局部刺眼，尚能勉強適應", penalty: 5 },
          { label: "C. 反光顯著，常需側頭、歪斜坐姿或瞇眼躲避光線", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "姿勢轉換頻率",
        question: "8. 進行電腦作業時，您通常「連續維持同一坐姿」多久才會起身？",
        options: [
          { label: "A. 45~60 分鐘內必定會起身走動、飲水或改變姿勢", penalty: 0 },
          { label: "B. 專注時約 1.5 ~ 2 小時起身活動一次", penalty: 15 },
          { label: "C. 常連續久坐超過 3 小時，直到生理需求迫使中斷", penalty: 30 }
        ]
      }
    ],

    student: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "頸肩部負荷",
        question: "1. 在教室或自習環境連續閱讀書寫 2 小時後，頸肩感受是？",
        options: [
          { label: "A. 頸肩部輕鬆放鬆，轉頭無阻滯感", penalty: 0 },
          { label: "B. 後頸肌肉持續緊繃發緊，想頻繁轉動頸部", penalty: 5 },
          { label: "C. 頸部僵硬發緊，甚至引發後腦勺脹痛與頭部昏重", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "back",
        dimensionName: "腰背部支撐",
        question: "2. 坐在學校木質課桌椅或補習班椅子上，腰背部的感覺？",
        options: [
          { label: "A. 軀幹坐姿穩定，背部無疲勞感", penalty: 0 },
          { label: "B. 久坐後腰部無力，容易骨盆前滑形成駝背癱坐", penalty: 5 },
          { label: "C. 尾椎或下背顯著酸痛，需頻繁變換姿勢或翹腳緩解", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "wrist",
        dimensionName: "手部末端負載",
        question: "3. 長時間書寫筆記、操作平板或手機時，手部與手腕感覺？",
        options: [
          { label: "A. 握筆或打字輕鬆靈活，無局部受壓痛感", penalty: 0 },
          { label: "B. 握筆手指處長繭壓痛，或大拇指根部肌肉發酸", penalty: 5 },
          { label: "C. 手腕手掌發麻無力，或手腕關節活動時有卡頓疼痛感", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "視覺調節負荷",
        question: "4. 連續看書或觀看螢幕較長時間後，視覺感受通常為？",
        options: [
          { label: "A. 視覺清晰敏銳，專注度持久穩定", penalty: 0 },
          { label: "B. 眼睛乾澀發脹，看書時需揉眼睛緩解", penalty: 5 },
          { label: "C. 視力暫時模糊、看遠方重新對焦困難，伴隨眼眶周圍酸脹", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "視線俯角",
        question: "5. 您平常閱讀書本、筆記或平板電腦時的視線角度？",
        options: [
          { label: "A. 使用閱讀立架將教材立起，維持自然平視俯角（小於20度）", penalty: 0 },
          { label: "B. 教材平放於桌面，頸部維持向前低頭約 45 度", penalty: 5 },
          { label: "C. 身體近距離趴近桌面，或以單手托腮側頭閱覽", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "下肢與骨盆承托",
        question: "6. 在課桌椅坐下時，雙腳踏地與腰部的狀態？",
        options: [
          { label: "A. 雙腳掌能平踏地面，大腿與小腿約呈 90 度，背部有支撐", penalty: 0 },
          { label: "B. 雙腳懸空或只能踩在椅槓上，腰部完全懸空無支撐", penalty: 5 },
          { label: "C. 習慣盤腿坐於椅面、翹二郎腿，或單側身體明顯傾斜", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "照明與手部陰影",
        question: "7. 閱讀書寫時，桌面的照明均勻度與反光狀況？",
        options: [
          { label: "A. 光線均勻明亮，書寫面無顯著手部或身軀陰影", penalty: 0 },
          { label: "B. 光線稍嫌偏暗，或書寫時有手部陰影遮擋部分字面", penalty: 5 },
          { label: "C. 燈具直接反射刺眼，或常在昏暗光線下使用螢幕", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "休息間歇與伸展",
        question: "8. 課間休息 10 分鐘或段落告一段落時，您的活動型態？",
        options: [
          { label: "A. 站立走動裝水、遠眺放鬆眼部睫狀肌", penalty: 0 },
          { label: "B. 留在座位上繼續低頭使用手機或平板", penalty: 15 },
          { label: "C. 直接以手臂枕頭趴睡桌面（手部神經與眼球受壓）", penalty: 30 }
        ]
      }
    ],

    standing: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "肩頸靜態負荷",
        question: "1. 站立值班或接待作業數小時後，肩頸部位的感覺？",
        options: [
          { label: "A. 肩部放鬆無壓迫感", penalty: 0 },
          { label: "B. 雙肩不自覺聳肩緊繃、頸部後側僵硬", penalty: 5 },
          { label: "C. 肩胛骨內側深層酸痛、頸椎活動受限", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "back",
        dimensionName: "腰椎與足底負載",
        question: "2. 長時間定點站立或走動作業後，下背與腳底板的反應？",
        options: [
          { label: "A. 下肢與腰部穩定，作業後無顯著不適", penalty: 0 },
          { label: "B. 腰部挺直發酸，腳後跟或足底筋膜隱隱作痛", penalty: 5 },
          { label: "C. 足底著地刺痛、腰部酸痛難以久站", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "wrist",
        dimensionName: "下肢靜脈回流",
        question: "3. 值班結束更換鞋襪時，小腿部位的狀態？",
        options: [
          { label: "A. 雙腿維持輕盈，無水腫緊繃感", penalty: 0 },
          { label: "B. 小腿緊繃腫脹、襪口有深刻壓痕", penalty: 5 },
          { label: "C. 小腿靜脈曲張浮現、夜間睡眠時偶有抽筋", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "整體體能續航",
        question: "4. 連續值班作業半天後，身心體能與專注度狀態？",
        options: [
          { label: "A. 精神充足，反應維持敏捷", penalty: 0 },
          { label: "B. 體能明顯下滑，需耗費較大意志力維持專注", penalty: 5 },
          { label: "C. 全身疲憊感加劇，作業與注意力容易出現疏漏", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "作業台面高度",
        question: "5. 您的工作櫃檯、收銀機或操作平台與手臂肘部的高度適配性？",
        options: [
          { label: "A. 作業台面約在手肘下方 5~10 公分（手臂自然垂放舒適操作）", penalty: 0 },
          { label: "B. 台面稍偏低，需頻繁微屈身前傾操作", penalty: 5 },
          { label: "C. 台面過高（需聳肩操作）或過低（需持續彎腰駝背）", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "鞋具與地面緩衝",
        question: "6. 您站立作業時穿著的鞋具與地面緩衝配置？",
        options: [
          { label: "A. 穿著具備良好足弓支撐與避震機能的鞋具，地面設有防疲勞軟墊", penalty: 0 },
          { label: "B. 普通平底鞋或硬底皮鞋，直接站在硬質地磚/水泥地面", penalty: 5 },
          { label: "C. 需穿著高跟鞋或薄底硬鞋久站，且無任何地面緩衝墊", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "站姿重心分配",
        question: "7. 在定點維持站姿時，您的重心習慣？",
        options: [
          { label: "A. 雙腳平分重心，核心微收，骨盆保持在中立位置", penalty: 0 },
          { label: "B. 習慣將重量長期集中於單腳（三七步站姿）或腹部前挺", penalty: 5 },
          { label: "C. 習慣倚靠櫃檯側傾站立，脊椎長期處於側彎狀態", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "坐姿轉換間歇",
        question: "8. 值班期間，您是否有機會短暫坐下或抬腿減輕下肢壓力？",
        options: [
          { label: "A. 每 1~2 小時有機會短暫坐下 3~5 分鐘舒緩下肢", penalty: 0 },
          { label: "B. 連續站立約 3~4 小時才能短暫坐下休息", penalty: 15 },
          { label: "C. 全天作業期間幾乎無法坐下，連續站立逾 6 小時", penalty: 30 }
        ]
      }
    ],

    technician: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "肩頸作業負荷",
        question: "1. 進行精細組裝、數位繪圖或維修時，肩頸部肌肉的感受？",
        options: [
          { label: "A. 動作流暢，肩部放鬆自然", penalty: 0 },
          { label: "B. 肩頸肌肉維持持續性收縮發僵", penalty: 5 },
          { label: "C. 單側肩膀劇痛，手臂抬舉時有明顯關節牽扯痛", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "back",
        dimensionName: "腰部受力負載",
        question: "2. 搬運物件、工具或維持固定前傾作業後，腰部狀態？",
        options: [
          { label: "A. 腰背有力，無疲累感", penalty: 0 },
          { label: "B. 下班時腰部僵硬，彎腰活動時感到酸楚", penalty: 5 },
          { label: "C. 曾有急性扭閃腰病史，或有經常性下背深層牽扯抽痛", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "wrist",
        dimensionName: "手指腕部關節",
        question: "3. 長時間握持工具/手繪筆或重複施力操作，手部感覺？",
        options: [
          { label: "A. 握持自如，手指腕關節活動靈活無阻", penalty: 0 },
          { label: "B. 手指關節酸脹，手腕內側或外側按壓微痛", penalty: 5 },
          { label: "C. 出現扳機指症狀（活動卡阻響聲）、腕關節劇烈疼痛無力", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "精細視覺負荷",
        question: "4. 長時間注視精密工件、線稿或細微零件後，視覺感受？",
        options: [
          { label: "A. 視線清晰敏銳，對比分辨良好", penalty: 0 },
          { label: "B. 眼睛乾澀發熱，向遠處觀看時需數秒重新對焦", penalty: 5 },
          { label: "C. 顯著眼眶周圍脹痛、頭暈，注視微細物件時出現疊影", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "作業視距與傾角",
        question: "5. 您的工作檯面或數位繪圖板的擺放傾斜度？",
        options: [
          { label: "A. 具備適當傾角（約 30~45 度），視線自然垂直作業面", penalty: 0 },
          { label: "B. 完全平放於桌面，需稍微低頭並向前伸長頸部作業", penalty: 5 },
          { label: "C. 完全平放或需扭轉軀幹側面操作，頸部大幅前傾旋轉", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "工具握柄人因設計",
        question: "6. 您常態使用的工具柄或筆具的人因工學適配性？",
        options: [
          { label: "A. 握柄粗細適中、包覆防滑減震材質，省力握持", penalty: 0 },
          { label: "B. 握柄過細或為硬質塑料，需使用較大捏握力量操作", penalty: 5 },
          { label: "C. 震動幅度大、邊緣硬銳，長期壓迫掌心神經與血管", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "物料搬運力矩",
        question: "7. 搬運物件或工具箱時，您的作業姿勢習慣？",
        options: [
          { label: "A. 屈膝下蹲，將物件緊靠胸口，運用腿部核心力量平穩起身", penalty: 0 },
          { label: "B. 雙膝保持挺直，直接彎腰前傾拉起物件", penalty: 5 },
          { label: "C. 彎腰同時扭轉軀幹搬起重物（椎間盤高風險動作）", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "反向伸展循環",
        question: "8. 進行重複性作業時，您是否會定時進行「反向舒緩伸展」？",
        options: [
          { label: "A. 每 30~45 分鐘會主動進行 20 秒反向放鬆與手指腕關節伸展", penalty: 0 },
          { label: "B. 只有在感到明顯酸麻無力時才會停下稍作甩動", penalty: 15 },
          { label: "C. 連續作業數小時不中斷，直到該工段結束才停歇", penalty: 30 }
        ]
      }
    ]
  },

  // 分數級距與改善行動指引
  scoreTiers: [
    {
      min: 85,
      max: 100,
      tier: "tier_green",
      title: "🟢 良好等級（低負載 / 優良配置）",
      subtitle: "工作站配置與作業習慣平衡良好",
      statusColor: "#059669",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      analysis: "您的工作站人因配置與動作力學維持得相當健全，各關節受力在安全閾值內，日常作業能維持穩定效率與精力。",
      actionGuides: [
        "維持既有良好節奏：持續維持 45~60 分鐘站立走動或微伸展習慣。",
        "落實護眼法則：落實「20-20-20 原則」（每 20 分鐘遠眺 20 呎/6 公尺外物體 20 秒）。",
        "定期檢視工作站：每季檢核椅墊高低與螢幕距離，預防耗損變形。"
      ]
    },
    {
      min: 70,
      max: 84,
      tier: "tier_yellow",
      title: "🟡 輕度警示（局部疲勞累積）",
      subtitle: "部分關節力矩過大，需進行環境微調",
      statusColor: "#d97706",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      analysis: "目前整體作業尚稱流暢，但頸肩或腕部等局部肌群已出現慢性過載跡象，下午專注力容易因肌肉緊繃而產生隱形損耗。",
      actionGuides: [
        "校準螢幕視角：將螢幕或筆記型電腦墊高 8~10 公分，使螢幕上緣齊平視線，降低後頸剪切力。",
        "手腕支撐減壓：打字與操作滑鼠時，手肘應由扶手或桌面提供約 90 度承托，避免腕部直接重壓桌緣。",
        "環境行為助推：可使用容量約 250~300ml 的水杯，自然促使自己每小時起身走動裝水。"
      ]
    },
    {
      min: 50,
      max: 69,
      tier: "tier_orange",
      title: "🟠 中度過載（高疲勞風險）",
      subtitle: "生物力學失衡，急需結構性調整配置",
      statusColor: "#ea580c",
      badgeColor: "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
      analysis: "評估顯示您的骨骼肌肉系統承受顯著負載。作業疲勞不僅影響工作效率與專注度，長期維持更可能轉變為累積性肌肉骨骼傷害（MSDs）。",
      actionGuides: [
        "改善腰椎承托：在腰椎第 4~5 節處增加適當厚度之後靠墊，引導骨盆維持中立位，分散下背負重。",
        "外接獨立鍵盤滑鼠：停止直接將筆記型電腦平放桌面長時間作業，務必搭配立架與外接鍵盤。",
        "導入定時動態間歇：設定 45 分鐘計時提醒，進行 1 分鐘全身反向伸展與深呼吸。"
      ]
    },
    {
      min: 0,
      max: 49,
      tier: "tier_red",
      title: "🔴 重度超載（高度傷害風險）",
      subtitle: "多部位高負荷，需立即進行環境改善",
      statusColor: "#dc2626",
      badgeColor: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      analysis: "您的肌肉骨骼系統目前處於高度緊繃狀態，多項人因地雷已引發持續性酸脹感。若未積極改善作業環境，恐造成不可逆的勞損與醫療代價。",
      actionGuides: [
        "全面重新配置工作站：以「手肘平放 90 度、眼睛平視螢幕、雙腳自然踏地」為基準，立即全面調整桌椅與設備高度。",
        "嚴格執行中斷機制：使用蕃茄鐘工作法，每工作 40 分鐘強制起立走動 2 分鐘。",
        "醫療專業諮詢：若手指麻木、關節刺痛或下背劇痛已持續超過兩週，強烈建議及早至復健科或物理治療所尋求專業評估。"
      ]
    }
  ],

  // 專業醫療與法律免責警語
  disclaimer:
    "⚠️ 免責聲明：本線上評估工具係依據北歐肌肉骨骼問卷 (NMQ) 原理及人因工程人體測量學設計之自我檢核指標，僅供個人化作業環境改善與健康促進之參考，非屬醫療診斷行為。若您已有持續性疼痛、神經壓迫麻木或骨骼關節病症，請務必尋求專業復健科醫師或物理治療師之診斷與治療。",

  /**
   * 動態個人化改善指引引擎
   * 根據學員點選的具體解剖痛點 (NMQ 0~5分)、左右側單側差異與環境地雷，動態組裝專屬指引
   */
  generatePersonalizedActionGuides: function(role, nmqData, traps) {
    const guides = [];
    nmqData = nmqData || {};
    traps = traps || {};

    // 取得所有有酸痛標記的部位 (>= 2分) 並依嚴重度降序排列
    const activeZones = Object.entries(nmqData)
      .filter(([id, level]) => level >= 2)
      .sort((a, b) => b[1] - a[1]);

    const rShoulder = nmqData.shoulder_r || 0;
    const lShoulder = nmqData.shoulder_l || 0;
    const rWrist = nmqData.wrist_r || 0;
    const lWrist = nmqData.wrist_l || 0;
    const neck = nmqData.neck || 0;
    const lowerback = nmqData.lowerback || 0;
    const upperback = nmqData.upperback || 0;
    const knees = Math.max(nmqData.knee_l || 0, nmqData.knee_r || 0);
    const ankles = Math.max(nmqData.ankle_l || 0, nmqData.ankle_r || 0);
    const hips = Math.max(nmqData.hip_l || 0, nmqData.hip_r || 0);

    // 規則 0：物料搬運與技術操作人因解法 (MMH 生物力學控制)
    if (role === "technician" || (lowerback >= 3 && (role === "technician" || role === "standing"))) {
      guides.push(
        "【物料搬運力量區控制（MMH）】：抬舉物料時務必緊貼身體中軸（肚臍 25 公分內），腰椎椎間盤力矩可即刻降低 50% 以上；轉身搬運時嚴禁「彎腰＋腰椎扭轉」，務必以「雙腳跨步轉向」；超過 20 公斤物料務必雙人協作或善用升降台車，將垂直抬舉轉化為水平推移滾動。"
      );
    }

    // 規則 1：右側單側失衡 (滑鼠外展與手腕前伸症候群)
    if ((rShoulder >= 3 || rWrist >= 3) && (rShoulder - lShoulder >= 2 || rWrist - lWrist >= 2 || traps.trap_chair)) {
      guides.push(
        "【右側滑鼠力矩減壓】：檢測顯示您的右側肩手負載顯著高於左側，代表滑鼠位置可能過於遠離身體中軸。請將滑鼠移至鍵盤右側 5 公分內，操作時上手臂自然下垂貼近軀幹，並將手肘穩固承托於扶手或桌面，消除整隻手臂約 3.5 公斤的懸臂重力拉扯。"
      );
    }

    // 規則 2：頸椎前傾與螢幕視角
    if (neck >= 3 || (neck >= 2 && traps.trap_screen)) {
      guides.push(
        "【頸椎力矩剪切校準】：您的頸部肌肉處於持續性張力狀態。請立即將螢幕或筆電架墊高 10~12 公分，讓螢幕頂端水平齊平眼睛，嚴禁直接低頭注視桌面平放筆電；每工作 45 分鐘進行 5 次「收下巴雙下巴運動」（水平後縮下巴 5 秒），重設深層頸屈肌長度。"
      );
    }

    // 規則 3：腰背部與骨盆支撐
    if (lowerback >= 3 || (lowerback >= 2 && traps.trap_chair)) {
      guides.push(
        "【腰椎骨盆力學支撐】：下背部酸痛多源於骨盆後傾與腰椎懸空。請在腰椎第 4~5 節凹槽處加裝腰靠墊（或將厚外套捲成圓柱狀塞入），強制骨盆維持直立中立位；同時調整座椅高度使雙腳掌平踏地面，大腿呈水平，避免椎間盤承受異常向後剪切力。"
      );
    }

    // 規則 4：左側肩腕負載 (鍵盤快捷鍵極限伸展 / 單側背包)
    if ((lShoulder >= 3 || lWrist >= 3) && lShoulder - rShoulder >= 1) {
      guides.push(
        "【左側肢體張力舒緩】：您的左側負載高於右側，請檢核日常是否習慣單肩背包、通話時單側歪頭夾耳機，或打字時左手大拇指與小指過度極限外展按壓快捷鍵（如頻繁 Ctrl+Z/Shift）。建議更換為雙肩後背包，並使用手托減緩左腕角度。"
      );
    }

    // 規則 5：上背胸椎緊繃 (圓肩駝背)
    if (upperback >= 3 && guides.length < 3) {
      guides.push(
        "【胸椎伸展與後仰放鬆】：上背緊繃代表胸椎過度前曲駝背。建議將辦公椅背後傾角度微調至 100~110 度（而非死板 90 度垂直），使軀幹重量部分轉移由椅背承載；作業間歇時雙手在背後交握向後拉伸，打開胸廓。"
      );
    }

    // 規則 6：下肢關節與足底筋膜 (久站或翹腳)
    if ((knees >= 3 || ankles >= 3 || hips >= 3) && guides.length < 3) {
      guides.push(
        "【下肢靜脈回流與重心重整】：若有久站或久坐骨盆酸痛，嚴禁翹二郎腿或單腳三七步站立；建議更換具備良好足弓支撐與避震機能的鞋墊；每小時進行 20 次「腳踝幫浦運動（勾腳背與踩油門動作）」，運用小腿肌肉泵浦加速下肢靜脈血液回流。"
      );
    }

    // 規則 7：環境眩光地雷
    if (traps.trap_glare && guides.length < 3) {
      guides.push(
        "【消除光環境刺眼眩光】：螢幕表面反光會迫使頭部歪斜閃光並加劇視疲勞。請微調螢幕前後俯仰角避開頭頂燈具反光，並落實「20-20-20 原則」（每用眼 20 分鐘，望向 6 公尺遠處放鬆睫狀肌 20 秒）。"
      );
    }

    // 規則 8：連續久坐超時地雷
    if (traps.trap_sedentary && guides.length < 3) {
      guides.push(
        "【建立物理中斷微習慣】：不要依賴自制力避免久坐。建議換用約 250ml 的小水杯，強迫自己喝完就必須起立走動裝水；並將 5 分鐘以內的電話溝通改為站立進行，打斷持續性椎間盤靜態壓迫。"
      );
    }

    // 若學員完全無酸痛標記 (全為 0~1分)，給予前瞻預防指引
    if (guides.length === 0) {
      guides.push(
        "【維持優質人因基準】：您的各關節力矩與作業姿勢維持良好！請持續維持「手肘 90 度有支撐、螢幕平視、雙腳著地」的良好配置。",
        "【動態間歇保養】：持續落實 45~60 分鐘微起身活動與 20-20-20 護眼原則，維持身體低折舊率。",
        "【環境前瞻預防】：每季檢視工作椅氣壓棒與螢幕支架螺絲，避免家具耗損導致無自覺的姿勢代償。"
      );
    }

    return guides.slice(0, 3); // 嚴選最關鍵的前 3 項精準指引
  }
};

if (typeof window !== "undefined") {
  window.ERGO_CONFIG = ERGO_CONFIG;
}

