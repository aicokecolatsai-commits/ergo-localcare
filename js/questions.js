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
      id: "repetitive_hand",
      seq: "04",
      icon: "🔧",
      name: "手部高頻操作與精細組裝族",
      subtitle: "產線組裝・工具操作・手部高頻重複",
      desc: "高頻率手部重複動作、手指捏握力、工具震動或手腕扭力，上肢前臂肌群與手腕關節持續性受力。",
      badge: "重複手部操作 (KIM-MHO)",
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
    },
    {
      id: "material_handling",
      seq: "05",
      icon: "📦",
      name: "重物搬運與物流推拉族",
      subtitle: "倉儲物流・重物抬舉・台車搬運拉推",
      desc: "常態人工抬舉搬運、重物裝卸或台車推拉，腰椎 L4-S1 剪力負載大，常有軀幹前傾扭轉與下肢承重。",
      badge: "人工抬舉搬運 (KIM-LHC/PP)",
      morandi: {
        color: "#8a3c1b",
        border: "#e4a88b",
        hoverBorder: "#b85328",
        bg: "linear-gradient(135deg, #fce8df 0%, #fdf4ee 100%)",
        badgeBg: "#f7cfbe",
        badgeText: "#521e08",
        seqColor: "#8a3c1b",
        titleColor: "#381203",
        descColor: "#61270f"
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

    repetitive_hand: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "肩頸作業負荷",
        question: "1. 進行手部重複操作、精密組裝或使用工具時，肩頸部肌肉的感受？",
        options: [
          { label: "A. 動作流暢，雙肩自然放鬆下沉，無僵硬感", penalty: 0 },
          { label: "B. 雙肩不自覺聳起發僵，後頸肌肉持續緊繃酸脹", penalty: 5 },
          { label: "C. 單側或雙側肩膀劇痛，手臂抬舉操作時有明顯關節牽扯痛", penalty: 10 }
        ]
      },
      {
        id: "q2_arm_wrist",
        dimension: "wrist",
        dimensionName: "前臂與手腕肌腱",
        question: "2. 連續進行手部高頻動作或工具旋轉後，前臂與手腕的狀態？",
        options: [
          { label: "A. 前臂靈活輕鬆，手腕關節活動自如", penalty: 0 },
          { label: "B. 前臂內側/外側肌肉酸脹（網球肘/高爾夫球肘前期感），手腕酸痛", penalty: 5 },
          { label: "C. 手腕劇烈抽痛、掌面發麻或活動時有肌腱摩擦摩擦感", penalty: 10 }
        ]
      },
      {
        id: "q3_finger_pinch",
        dimension: "wrist",
        dimensionName: "手指捏力與關節",
        question: "3. 長時間使用手指進行捏握 (Pinch)、按壓或微細物件組裝後，手指狀態？",
        options: [
          { label: "A. 手指活動靈活敏銳，無卡阻無酸痛", penalty: 0 },
          { label: "B. 指節酸脹晨間微僵，大拇指根部按壓微痛", penalty: 5 },
          { label: "C. 出現扳機指症狀（活動時卡阻響聲）、指尖發麻無力", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "精細視覺負荷",
        question: "4. 長時間注視微小零件、焊點、精密儀表或細微裝配介面後，眼睛感受？",
        options: [
          { label: "A. 視線清晰敏銳，對比分辨良好", penalty: 0 },
          { label: "B. 眼睛乾澀發熱、需用力眨眼或數秒重新對焦", penalty: 5 },
          { label: "C. 眼眶脹痛、頭暈，注視微細物件時出現疊影或視力模糊", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "作業檯面高度與支撐",
        question: "5. 您的手部作業檯面高度與手肘支撐情況？",
        options: [
          { label: "A. 檯面高度適中（手肘呈 90~105 度自然平放），手臂有舒適托撐", penalty: 0 },
          { label: "B. 檯面略高或略低，作業時手肘懸空無支撐", penalty: 5 },
          { label: "C. 檯面高度嚴重不當，需長時間聳肩懸臂或深度低頭前傾操作", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "工具握柄人因設計",
        question: "6. 您常態使用的手工具/夾具/操作柄人因設計？",
        options: [
          { label: "A. 握柄粗細符合手型、具防滑減震包覆，省力操作", penalty: 0 },
          { label: "B. 握柄過細/過粗或為硬質塑料，需較大捏握力操作", penalty: 5 },
          { label: "C. 工具震動幅度大、邊緣硬銳壓迫掌心，或需極端折腕施力", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "手腕偏轉角度",
        question: "7. 操作過程中，手腕是否經常處於極端彎曲或扭轉（橈偏/尺偏）角度？",
        options: [
          { label: "A. 手腕多能維持在直立中立位 (Neutral Position)", penalty: 0 },
          { label: "B. 偶爾因作業角度需要而折腕或扭轉手腕", penalty: 5 },
          { label: "C. 絕大部分時間手腕處於極度背屈、掌屈或過度扭轉施力", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "定時手部微伸展",
        question: "8. 進行重複性手部操作時，您是否會定時進行「反向舒緩伸展」？",
        options: [
          { label: "A. 每 30~45 分鐘主動進行 20 秒手腕前臂反向放鬆微伸展", penalty: 0 },
          { label: "B. 只有在感到明顯酸麻無力時才會停下稍作甩動", penalty: 15 },
          { label: "C. 連續作業數小時不中斷，直到工段結束才停歇", penalty: 30 }
        ]
      }
    ],

    material_handling: [
      {
        id: "q1_neck",
        dimension: "back",
        dimensionName: "腰椎搬運負載",
        question: "1. 執行人工搬運、抬舉貨物或推拉台車後，腰部與下背狀態？",
        options: [
          { label: "A. 腰背有力無酸痛，活動輕鬆自如", penalty: 0 },
          { label: "B. 下班時腰部僵硬沉重，彎腰或挺直時感到酸楚發緊", penalty: 5 },
          { label: "C. 曾有急性閃腰病史，或有經常性下背深層抽痛、傳導至下肢", penalty: 10 }
        ]
      },
      {
        id: "q2_lower_back",
        dimension: "neck",
        dimensionName: "肩部與上背承受力矩",
        question: "2. 抬舉重物或推拉重型台車時，雙肩與上背的感受？",
        options: [
          { label: "A. 肩胛與上背穩定支撐，無明顯緊繃", penalty: 0 },
          { label: "B. 肩膀與膏肓處酸痛緊繃，提重物時感到肩膀向下沉重牽拉", penalty: 5 },
          { label: "C. 肩關節抬舉無力刺痛、手臂外展時有夾擠痛感", penalty: 10 }
        ]
      },
      {
        id: "q3_wrist",
        dimension: "back",
        dimensionName: "下肢膝關節與雙腿",
        question: "3. 搬運過程中頻繁蹲下起立、負重行走，膝蓋與雙腿感受？",
        options: [
          { label: "A. 雙腿步伐穩健有力，關節無卡阻酸軟", penalty: 0 },
          { label: "B. 膝關節前側酸脹、起立時雙腿略顯發沉", penalty: 5 },
          { label: "C. 膝蓋彎曲時有卡阻響聲或刺痛，負重時膝蓋不穩定發軟", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "wrist",
        dimensionName: "抓握手感與手部疲勞",
        question: "4. 搬運箱體或料盒時，手掌與手指的抓握狀態？",
        options: [
          { label: "A. 物件具備良好手把或凹槽，抓握穩固省力", penalty: 0 },
          { label: "B. 物件無適當把手，需用力掐握箱底或邊緣，手指容易酸軟", penalty: 5 },
          { label: "C. 經常搬運滑溜、邊緣銳利或過大無把手重物，手部極度疲累", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "搬運起始姿勢與重心力矩",
        question: "5. 從地面抬起重物時，您的標準姿勢習慣？",
        options: [
          { label: "A. 屈膝下蹲，將物件緊貼身體胸腹核心，運用腿部力量平穩起身", penalty: 0 },
          { label: "B. 雙膝微彎但主要仍彎腰前傾拉起物件", penalty: 5 },
          { label: "C. 雙腿完全挺直直接彎腰，甚至彎腰同時扭轉軀幹搬起重物（極高危險）", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "抬舉高度與作業範圍",
        question: "6. 常態搬運或堆疊物件的高度分佈？",
        options: [
          { label: "A. 物品多在膝蓋以上至手肘高度（黃金人因省力區間）", penalty: 0 },
          { label: "B. 常需從地面直接抬起，或需抬舉至胸口高度", penalty: 5 },
          { label: "C. 頻繁需自地面深蹲抬起，或高舉過肩放置於高層貨架", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "台車推拉施力與動線",
        question: "7. 使用台車或拖板車運送貨物時的施力狀態？",
        options: [
          { label: "A. 台車輪胎順暢、地面平整，使用全身重心向前「推」行", penalty: 0 },
          { label: "B. 偶爾遇到地面坑洞或輪胎卡阻，需加大全身力道推動", penalty: 5 },
          { label: "C. 經常以單手或倒退方式「拉」重型台車，或常在斜坡費力推拉", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "負重頻率與恢復間歇",
        question: "8. 每日重物搬運的總頻率與休息恢復間歇？",
        options: [
          { label: "A. 搬運單件大多在 15kg 以下，每批搬運後有足夠時間伸展調整", penalty: 0 },
          { label: "B. 常搬運 15~25kg 物件，連續搬運約 1 小時才有短暫休息", penalty: 15 },
          { label: "C. 經常單人搬運超過 25kg 重物，且高頻率連續搬運無適當緩衝", penalty: 30 }
        ]
      }
    ],

    // 相容別名
    technician: [
      {
        id: "q1_neck",
        dimension: "neck",
        dimensionName: "肩頸作業負荷",
        question: "1. 進行手部重複操作、組裝或使用工具時，肩頸部肌肉的感受？",
        options: [
          { label: "A. 動作流暢，雙肩自然放鬆下沉，無僵硬感", penalty: 0 },
          { label: "B. 雙肩不自覺聳起發僵，後頸肌肉持續緊繃酸脹", penalty: 5 },
          { label: "C. 單側或雙側肩膀劇痛，手臂抬舉操作時有明顯關節牽扯痛", penalty: 10 }
        ]
      },
      {
        id: "q2_arm_wrist",
        dimension: "wrist",
        dimensionName: "前臂與手腕肌腱",
        question: "2. 連續進行手部高頻動作或工具旋轉後，前臂與手腕的狀態？",
        options: [
          { label: "A. 前臂靈活輕鬆，手腕關節活動自如", penalty: 0 },
          { label: "B. 前臂內側/外側肌肉酸脹，手腕酸痛", penalty: 5 },
          { label: "C. 手腕劇烈抽痛、掌面發麻或活動時有肌腱摩擦感", penalty: 10 }
        ]
      },
      {
        id: "q3_finger_pinch",
        dimension: "wrist",
        dimensionName: "手指捏力與關節",
        question: "3. 長時間使用手指進行捏握、按壓或微細物件組裝後，手指狀態？",
        options: [
          { label: "A. 手指活動靈活敏銳，無卡阻無酸痛", penalty: 0 },
          { label: "B. 指節酸脹晨間微僵，大拇指根部按壓微痛", penalty: 5 },
          { label: "C. 出現扳機指症狀、指尖發麻無力", penalty: 10 }
        ]
      },
      {
        id: "q4_eye",
        dimension: "eye",
        dimensionName: "精細視覺負荷",
        question: "4. 長時間注視微小零件、焊點或精密儀表後，眼睛感受？",
        options: [
          { label: "A. 視線清晰敏銳，對比分辨良好", penalty: 0 },
          { label: "B. 眼睛乾澀發熱、需用力眨眼或數秒重新對焦", penalty: 5 },
          { label: "C. 眼眶脹痛、頭暈，注視微細物件時出現疊影", penalty: 10 }
        ]
      },
      {
        id: "q5_screen_height",
        dimension: "trap_screen",
        dimensionName: "作業檯面高度與支撐",
        question: "5. 您的手部作業檯面高度與手肘支撐情況？",
        options: [
          { label: "A. 檯面高度適中（手肘呈 90~105 度自然平放），手臂有舒適托撐", penalty: 0 },
          { label: "B. 檯面略高或略低，作業時手肘懸空無支撐", penalty: 5 },
          { label: "C. 檯面高度嚴重不當，需長時間聳肩懸臂操作", penalty: 10 }
        ]
      },
      {
        id: "q6_chair_support",
        dimension: "trap_chair",
        dimensionName: "工具握柄人因設計",
        question: "6. 您常態使用的手工具/夾具人因設計？",
        options: [
          { label: "A. 握柄粗細適中、具防滑減震包覆，省力操作", penalty: 0 },
          { label: "B. 握柄過細/過粗，需較大捏握力操作", penalty: 5 },
          { label: "C. 工具震動幅度大、邊緣硬銳壓迫掌心", penalty: 10 }
        ]
      },
      {
        id: "q7_glare",
        dimension: "trap_glare",
        dimensionName: "手腕偏轉角度",
        question: "7. 操作過程中，手腕是否經常處於極端彎曲或扭轉角度？",
        options: [
          { label: "A. 手腕多能維持在直立中立位", penalty: 0 },
          { label: "B. 偶爾因作業角度需要而折腕或扭轉手腕", penalty: 5 },
          { label: "C. 絕大部分時間手腕處於極度背屈或扭轉施力", penalty: 10 }
        ]
      },
      {
        id: "q8_sedentary",
        dimension: "trap_sedentary",
        dimensionName: "定時手部微伸展",
        question: "8. 進行重複性手部操作時，您是否會定時進行反向伸展？",
        options: [
          { label: "A. 每 30~45 分鐘主動進行 20 秒手腕前臂微伸展", penalty: 0 },
          { label: "B. 只有在感到明顯酸麻無力時才會停下稍作甩動", penalty: 15 },
          { label: "C. 連續作業數小時不中斷，直到工段結束才停歇", penalty: 30 }
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
   * 根據學員點選的具體解剖痛點 (NMQ 15區 0~5分)、環境檢核地雷與前後測對照，動態產出高精準度專屬處方
   */
  generatePersonalizedActionGuides: function(role, nmqData, traps, isRetest = false, baselineNmqData = null) {
    nmqData = nmqData || {};
    traps = traps || {};
    baselineNmqData = baselineNmqData || {};

    const bodyGuides = [];
    const envGuides = [];
    const retestGuides = [];

    // 15 解剖部位專屬人體工學與生理力學處方庫
    const zonePrescriptions = {
      neck: "【頸部與後頸緊繃】：螢幕頂端務必平齊視線，嚴禁低頭操作平放筆電；每 45 分鐘施作「縮下巴運動 (Chin Tuck)」5次，啟動頸椎深層頸屈肌，消除烏龜頸與後頸過度代償。",
      shoulder_r: "【右肩與旋轉肌袖減壓】：滑鼠置於鍵盤右側 5 公分內，操作時上手臂垂直自然下垂，手肘穩放扶手或桌面（嚴禁懸臂）；工間施作「門框擴胸」打開前側短縮的胸大肌。",
      shoulder_l: "【左肩與斜方肌放鬆】：檢核日常是否習慣單肩背負重物或歪頭通話；打字時左手臂自然靠托，每小時施作「靠牆天使運動」活化下斜方肌與前鋸肌。",
      upperback: "【上背與膏肓盲區舒緩】：上背緊繃源於胸椎過度駝背前曲。請將座椅靠背微後仰至 100~110 度分散脊椎剪力；作業間歇雙手在背後互扣向後向上延伸 15 秒，舒緩菱形肌與膏肓緊繃。",
      lowerback: "【腰椎椎間盤力矩減壓】：加裝人體工學腰靠支撐第 4~5 腰椎，維持正常腰椎前凸弧度；嚴禁骨盆後傾半躺半坐；每 50 分鐘起立活動，避免椎間盤靜態剪切力累積。",
      elbow_r: "【右手肘肌腱與外上髁減壓】：避免打字與點擊滑鼠時手肘懸空懸臂施力；工間進行前臂伸肌與屈肌拉筋（手臂伸直、手腕向下與向上輕拉各 15 秒），預防網球肘與肌腱炎。",
      elbow_l: "【左手肘關節與肌腱放鬆】：調整左側扶手使手肘呈 90 度自然承托，避免左臂長時間懸空打字或按壓快捷鍵；定時施作前臂旋前旋後微伸展。",
      wrist_r: "【右手腕中立位與腕隧道減壓】：鍵盤滑鼠高度需與手肘齊平，手腕保持水平平直（嚴禁背屈 > 15 度）；加裝軟質滑鼠手托承托掌根，消除腕隧道高壓與滑鼠手麻木。",
      wrist_l: "【左手腕正中神經保護】：檢核鍵盤是否過高導致左手腕過度上翹；打字時手腕浮起或平放於手托，避免左手拇指與小指極限外展按壓快捷鍵。",
      hip_r: "【右側骨盆中立與坐骨神經釋放】：嚴禁翹二郎腿或盤腿；落實雙側坐骨均勻承重；工間施作「椅上 4 字翹腳臀部伸展」，釋放緊繃梨狀肌與骨盆壓力。",
      hip_l: "【左側骨盆平衡與深層肌舒緩】：避免單邊側坐或將皮夾墊在後口袋；維持骨盆水平中立，每小時起立走動重啟下肢血流。",
      knee_r: "【右膝關節力學減壓】：座椅高度需使雙腳掌平踏地面，大腿水平，膝關節微開 90~100 度；避免右腳習慣勾回座椅下方或向內扣夾。",
      knee_l: "【左膝關節循環重整】：調整座椅深度（椅面前緣與膝蓋後窩保留 2~3 指寬隙縫），避免大腿下緣血管與神經遭受椅面壓迫。",
      ankle_r: "【右踝與下肢靜脈回流】：若座椅過高雙腳無法平踏請加腳踏板；每小時進行 20 次「腳踝幫浦運動（勾腳背與踩油門）」，加速靜脈回流與預防下肢沉重。",
      ankle_l: "【左踝與足底筋膜重整】：換穿具備良好足弓支撐與避震機能的鞋款；定時轉動踝關節，促進下肢末梢循環。"
    };

    // 1. 生成人體圖痛點部位專屬處方 (嚴格只針對「本次實際點選 level >= 1」之解剖部位，按嚴重度排序)
    const activeZones = Object.entries(nmqData || {})
      .filter(([id, level]) => (level || 0) >= 1 && zonePrescriptions[id])
      .sort((a, b) => b[1] - a[1]);

    activeZones.forEach(([id, level]) => {
      const p = zonePrescriptions[id];
      if (p) {
        bodyGuides.push(p);
      }
    });

    if (bodyGuides.length === 0) {
      bodyGuides.push(
        "【維持優質人因基準】：您目前全身體幹與主要關節維持良好低折舊狀態！請持續落實「手肘有支撐、螢幕平視、雙腳平踏地面」的優質人因配置。"
      );
    }

    // 2. 生成工作站環境配置調整方針 (結合危害檢核與作業型態人因黃金標準)
    if (traps.trap_screen || nmqData.neck >= 2) {
      envGuides.push(
        "【螢幕視線高度校準】：將外接螢幕或筆電架墊高 10~12 公分，讓螢幕上緣落在視線水平線，避免低頭視線角 > 15 度造成頸椎 20 公斤以上代償負荷。"
      );
    }

    if (traps.trap_chair || nmqData.lowerback >= 2 || (nmqData.shoulder_r >= 2 && nmqData.shoulder_l >= 2)) {
      envGuides.push(
        "【座椅支撐與坐姿微調】：調整椅面高度使雙腳掌平踏地面，在腰部凹槽處加裝腰靠支撐，手肘自然置於扶手或桌面，消除整隻手臂懸臂重力拉扯。"
      );
    }

    if (traps.trap_sedentary) {
      envGuides.push(
        "【建立物理中斷微習慣】：換用約 250ml 小水杯，強迫自己喝完就起立走動裝水；落實每 50 分鐘站立活動 1~2 分鐘，打斷持續性椎間盤靜態壓迫。"
      );
    }

    if (traps.trap_glare) {
      envGuides.push(
        "【消除光環境刺眼眩光】：微調螢幕前後俯仰角度避開頭頂燈具反光，並落實「20-20-20 護眼原則」（每 20 分鐘遠眺 20 呎外景物 20 秒）。"
      );
    }

    if (role === "material_handling" || (nmqData.lowerback >= 3 && (role === "material_handling" || role === "technician" || role === "standing"))) {
      envGuides.push(
        "【物料搬運力量區控制（MMH）】：抬舉物料時緊貼身體中軸（肚臍 25 公分內），腰椎力矩可即刻降低 50% 以上；轉身搬運時嚴禁「彎腰＋腰椎扭轉」，務必以「雙腳跨步轉向」；超過 20 公斤物料務必雙人協作或善用升降台車。"
      );
    } else if (role === "repetitive_hand" || nmqData.wrist_r >= 2 || nmqData.wrist_l >= 2) {
      envGuides.push(
        "【手部高頻重複減壓與工具配置（MHO）】：手腕保持在中立位操作，避免極端折腕；選用符合手型且包覆減震防滑材質之握把工具；每 30 分鐘進行前臂伸肌與腕屈肌反向微伸展。"
      );
    }

    // 若未觸發特定地雷，依作業型態注入黃金人因標準方針 (確保學員永遠獲得清晰環境指引)
    if (envGuides.length === 0) {
      if (role === "office") {
        envGuides.push(
          "【黃金辦公站位配置】：螢幕頂端齊平視線（俯角 10~15 度）、手肘放置桌面呈 90 度有支撐（嚴禁懸臂）、雙腳平踏地面，落實身體折舊最小化。",
          "【動態間歇保養】：持續落實 50 分鐘起身活動 1 分鐘與 20-20-20 護眼原則，維持身體低折舊率。"
        );
      } else if (role === "standing") {
        envGuides.push(
          "【站姿作業人因適配】：工作台面維持在手肘下方 5~10 公分；穿著足弓支撐減震鞋墊並善用防疲勞地墊，每小時定時進行腳踝幫浦運動促進下肢血液回流。",
          "【重心交替與間歇坐下】：避免單腳三七步站立，爭取每 1~2 小時短暫坐下 3 分鐘釋放腰椎壓力。"
        );
      } else if (role === "repetitive_hand") {
        envGuides.push(
          "【精密手部作業力學維護】：工作檯面調整至手肘自然支撐高度，前臂加裝軟質靠墊；每 30~45 分鐘執行手腕與手指反向伸展，預防肌腱炎與腕隧道症候群。",
          "【工具人因適配】：檢查常用工具握柄，避免金屬硬邊壓迫掌心血管與正中神經。"
        );
      } else if (role === "material_handling") {
        envGuides.push(
          "【重物抬舉搬運黃金法則】：搬運物件緊靠軀幹胸腹核心，屈膝蹲下代替直接彎腰，轉向時以腳步移動取代腰椎扭轉。",
          "【推拉動線與減力配置】：優先以全身重心向前「推」台車而非單手倒退拉行；單人負重上限嚴格控制在 20kg 內。"
        );
      } else {
        envGuides.push(
          "【動態間歇保養】：持續落實 45~60 分鐘微起身活動與 20-20-20 護眼原則，維持身體低折舊率。",
          "【環境前瞻預防】：每季檢視工作環境設備，避免器具耗損導致無自覺的姿勢代償。"
        );
      }
    }

    // 3. 生成前後測對照成效與維持指引 (若處於前後測狀態)
    if (isRetest && baselineNmqData) {
      const allKeys = Array.from(new Set([...Object.keys(baselineNmqData), ...Object.keys(nmqData)]));
      
      allKeys.forEach((key) => {
        const prevLevel = baselineNmqData[key] || 0;
        const currLevel = nmqData[key] || 0;
        const zoneObj = NMQ_ZONES.find(z => z.id === key);
        const zoneName = zoneObj ? zoneObj.name : key;

        if (prevLevel > currLevel) {
          retestGuides.push(
            `🟢【${zoneName}舒緩改善 (前測 ${prevLevel}分 ➔ 改善後 ${currLevel}分)】：課堂現場伸展與姿勢微調效果顯著！日常請持續維持工間微伸展，建立肌肉記憶防止緊繃復發。`
          );
        } else if (currLevel > 0 && currLevel >= prevLevel) {
          retestGuides.push(
            `🟡【${zoneName}仍有殘留緊繃 (${currLevel}分)】：此部位屬於深層慢性累積張力，建議課後持續執行專屬拉筋動作，並檢查工作站該側是否仍有懸臂或歪斜代償。`
          );
        }
      });

      if (retestGuides.length === 0) {
        retestGuides.push(
          "🌟【課堂改善整體評估】：前後測各部位均維持健康優良水準！請持續落實良好工作習慣。"
        );
      }
    }

    // 組裝整合型清單（兼具陣列相容性與結構化屬性）
    const allGuides = [
      ...(isRetest && retestGuides.length > 0 ? retestGuides.slice(0, 2) : []),
      ...bodyGuides.slice(0, 3),
      ...envGuides.slice(0, 2)
    ];

    const result = [...allGuides];
    result.bodyGuides = bodyGuides;
    result.envGuides = envGuides;
    result.retestGuides = retestGuides;
    result.allGuides = allGuides;

    return result;
  }
};

if (typeof window !== "undefined") {
  window.ERGO_CONFIG = ERGO_CONFIG;
}

