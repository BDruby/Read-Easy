import crypto from 'crypto';

export interface DoubaoVoiceInfo {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  category: 'novel' | 'romance' | 'mature' | 'youth' | 'anime' | 'english';
  categoryName: string;
  tags: string[];
  description: string;
  previewText?: string;
}

export interface DoubaoTTSOptions {
  voice?: string;
  speed?: number; // 0.5 - 2.0 -> speed_ratio
  volume?: number; // 1.0 default
  pitch?: number; // 1.0 default
  cluster?: string;
  contextText?: string; // 豆包 2.0 自然语言控制指令，如 "用很生气、吵架的语气对话"、"用纯正东北话口音朗读"
}

/**
 * 豆包语音合成大模型 2.0 (Seed-TTS 2.0) 官方认证音色库 (全量支持 *_uranus_bigtts)
 * 特性：高保真拟真、自然呼吸声、多语种/方言自然语言指令控制
 */
export const DOUBAO_VOICES: DoubaoVoiceInfo[] = [
  // 1. 网文演播 / 爆款全能
  {
    id: 'zh_female_vv_uranus_bigtts',
    name: 'Vivi 2.0 (女声 · 豆包旗舰/全能演播)',
    gender: 'Female',
    category: 'novel',
    categoryName: '网文演播',
    tags: ['官方旗舰', '抑扬顿挫', '全题材通用'],
    description: '豆包大模型2.0官方旗舰女声，温柔自然、抑扬顿挫，全题材网文通吃首选',
    previewText: '夜色如墨，远处的山峦在月光下连绵起伏，仿佛沉睡的巨兽。',
  },
  {
    id: 'zh_female_shuangkuaisisi_uranus_bigtts',
    name: '爽快思思 2.0 (女声 · 爆款女频/爽利灵动)',
    gender: 'Female',
    category: 'novel',
    categoryName: '网文演播',
    tags: ['女频爆款', '爽快利落', '打脸爽文'],
    description: '明快利落、生动活泼，极度契合女频打脸爽文、言情宠文与日常轻小说',
    previewText: '就凭你们也想拦我？今天这笔账，咱们当面算个清楚！',
  },
  {
    id: 'zh_male_m191_uranus_bigtts',
    name: '云舟 2.0 (男声 · 沉稳叙事/悬疑惊悚说书)',
    gender: 'Male',
    category: 'novel',
    categoryName: '网文演播',
    tags: ['玄幻仙侠', '悬疑盗墓', '低沉磁性', '男频首选'],
    description: '低沉磁性、叙事张力极强，玄幻仙侠、盗墓悬疑与历史演义绝佳男声',
    previewText: '古墓深处的水滴声清晰可闻，黑棺上的青铜锁链仿佛刚刚动了一下……',
  },
  {
    id: 'zh_female_xiaohe_uranus_bigtts',
    name: '小何 2.0 (女声 · 温暖治愈/舒缓自然)',
    gender: 'Female',
    category: 'novel',
    categoryName: '网文演播',
    tags: ['温暖治愈', '慢节奏种田', '现代生活'],
    description: '纯净温和、语调治愈自然，适合现代都市、慢节奏种田与生活流小说',
    previewText: '晨曦微露，茶馆的蒸笼冒着白汽，小镇的一天又慢悠悠地开始了。',
  },
  {
    id: 'zh_female_cancan_uranus_bigtts',
    name: '知性灿灿 2.0 (女声 · 知性干练/职场精英)',
    gender: 'Female',
    category: 'novel',
    categoryName: '网文演播',
    tags: ['都市职场', '知性干练', '豪门商战'],
    description: '干练优雅、从容大方，适合现代商战、职场大女主与律政刑侦',
    previewText: '合同条款我们已经全部审核完毕，接下来就看贵方的诚意了。',
  },
  {
    id: 'zh_female_qingxinnvsheng_uranus_bigtts',
    name: '清新女声 2.0 (女声 · 清新自然/空灵脱俗)',
    gender: 'Female',
    category: 'novel',
    categoryName: '网文演播',
    tags: ['清新脱俗', '古风仙侠', '白月光'],
    description: '纯澈清亮、仙气飘渺，适合仙侠白月光、古典神话与玄幻圣女',
    previewText: '千山暮雪，若能与君重逢于此，纵使前路漫漫亦无怨无悔。',
  },
  {
    id: 'zh_female_wenroushunv_uranus_bigtts',
    name: '温柔淑女 2.0 (女声 · 古典温婉/大家闺秀)',
    gender: 'Female',
    category: 'novel',
    categoryName: '网文演播',
    tags: ['古风闺秀', '温婉贤淑', '宫斗宅斗'],
    description: '温婉贤淑、语调轻缓，适合宫斗宅斗、古风言情与大家闺秀',
    previewText: '妾身深知世事无常，只愿院中岁月静好，莫负了这韶华时光。',
  },
  {
    id: 'zh_female_kefunvsheng_uranus_bigtts',
    name: '暖阳女声 2.0 (女声 · 温暖亲和/柔和从容)',
    gender: 'Female',
    category: 'novel',
    categoryName: '网文演播',
    tags: ['温暖亲和', '叙述柔和', '家庭都市'],
    description: '端庄柔和、娓娓道来，适合长篇温情小说与生活记录',
    previewText: '岁月流转，老屋前的那棵银杏树依然每年金黄，记录着几代人的故事。',
  },

  // 2. 甜宠言情
  {
    id: 'zh_female_tianmeixiaoyuan_uranus_bigtts',
    name: '甜美小源 2.0 (女声 · 甜宠言情/青春少女)',
    gender: 'Female',
    category: 'romance',
    categoryName: '甜宠言情',
    tags: ['甜宠女主', '青春校园', '软萌灵动'],
    description: '轻柔甜润、少女感满满，青春校园、轻小说与甜宠女主首选',
    previewText: '你今天怎么来得这么晚呀，我都等你半天了呢！',
  },
  {
    id: 'zh_female_meilinvyou_uranus_bigtts',
    name: '魅力女友 2.0 (女声 · 轻熟感性/细腻动人)',
    gender: 'Female',
    category: 'romance',
    categoryName: '甜宠言情',
    tags: ['轻熟魅力', '情感虐恋', '细腻动人'],
    description: '声线轻熟有质感，情感充沛细腻，适合情感虐恋、都市婚恋与强情绪交锋',
    previewText: '有时候我真想知道，在你心里，究竟有没有哪怕一瞬间在乎过我？',
  },
  {
    id: 'zh_female_sajiaoxuemei_uranus_bigtts',
    name: '撒娇学妹 2.0 (女声 · 撒娇甜美/软萌萝莉)',
    gender: 'Female',
    category: 'romance',
    categoryName: '甜宠言情',
    tags: ['软萌撒娇', '欢喜冤家', '恋爱轻喜'],
    description: '软糯黏人、灵动可爱，适合恋爱日常、轻小说师妹与欢喜冤家',
    previewText: '学长，你就帮我这一次嘛，求求你啦，大不了我请你喝奶茶！',
  },
  {
    id: 'zh_female_linjianvhai_uranus_bigtts',
    name: '邻家女孩 2.0 (女声 · 亲切邻家/活泼日常)',
    gender: 'Female',
    category: 'romance',
    categoryName: '甜宠言情',
    tags: ['邻家活泼', '都市日常', '青梅竹马'],
    description: '亲切可人、邻家妹妹感强，适合青春轻小说与青梅竹马文',
    previewText: '快点走啦，待会儿公交车都要开走了，你可别想让我等你！',
  },
  {
    id: 'zh_female_tianmeitaozi_uranus_bigtts',
    name: '甜美桃子 2.0 (女声 · 蜜桃甜心/元气满满)',
    gender: 'Female',
    category: 'romance',
    categoryName: '甜宠言情',
    tags: ['元气少女', '甜宠爽文', '快穿系统'],
    description: '活泼元气、声线甜润，适合快穿系统文与现代甜爽文',
    previewText: '叮！宿主请注意，您的专属恋爱养成任务已正式触发！',
  },
  {
    id: 'zh_male_sophie_uranus_bigtts',
    name: '苏菲 2.0 (女声 · 知性轻熟/柔美温润)',
    gender: 'Female',
    category: 'romance',
    categoryName: '甜宠言情',
    tags: ['知性轻熟', '女声声线', '情感交锋'],
    description: '温柔细腻的知性轻熟女声，语调柔和动人（火山后台模型名为Sophie）',
    previewText: '有些秘密藏在心底太久，也许只有在最黑的夜晚，才敢轻易说出口。',
  },

  // 3. 成熟沉稳 / 大叔反派
  {
    id: 'zh_male_dayi_uranus_bigtts',
    name: '大义 2.0 (男声 · 沧桑大叔/威严长辈/宗师反派)',
    gender: 'Male',
    category: 'mature',
    categoryName: '成熟沉稳',
    tags: ['沧桑大叔', '威严长辈', '宗派宗师', '反派霸气'],
    description: '低沉沧桑的大叔音色，充满岁月厚重感与霸气威压，玄幻长老、宗师与反派首选',
    previewText: '老夫纵横修真界三百年，岂容你这无知小辈在此放肆妄为！',
  },
  {
    id: 'zh_male_ruyayichen_uranus_bigtts',
    name: '儒雅逸辰 2.0 (男声 · 温润如玉/古风雅韵)',
    gender: 'Male',
    category: 'mature',
    categoryName: '成熟沉稳',
    tags: ['温润如玉', '古风书生', '仙侠仙尊', '白月光男二'],
    description: '典雅端方、不疾不徐，极具文人墨客书卷气，古风架空与仙侠首选',
    previewText: '落子无悔。这盘残棋，正如这天下大势，早已注定你我宿命。',
  },
  {
    id: 'zh_male_liufei_uranus_bigtts',
    name: '刘飞 2.0 (男声 · 成熟沉着/商战权谋)',
    gender: 'Male',
    category: 'mature',
    categoryName: '成熟沉稳',
    tags: ['商战权谋', '都市精英', '成熟沉着', '刑侦探案'],
    description: '稳重沉着、气场内敛，适合都市官场、商战博弈与刑侦探案小说',
    previewText: '商场如战场，每一个看似微小的决策背后，都牵扯着百亿资金的博弈。',
  },

  // 4. 热血少年 / 主角逆袭
  {
    id: 'zh_male_taocheng_uranus_bigtts',
    name: '小天 2.0 (男声 · 阳光青年/修真热血主角)',
    gender: 'Male',
    category: 'youth',
    categoryName: '热血少年',
    tags: ['热血主角', '修仙逆袭', '阳光清澈', '少年意气'],
    description: '少年感清澈饱满、朝气蓬勃，修仙逆袭、电竞文与玄幻主角第一人称',
    previewText: '三十年河东，三十年河西，莫欺少年穷！今天我一定要赢！',
  },
  {
    id: 'zh_male_shaonianzixin_uranus_bigtts',
    name: '少年梓辛 2.0 (男声 · 意气少年/清新爽朗)',
    gender: 'Male',
    category: 'youth',
    categoryName: '热血少年',
    tags: ['清爽少年', '校园学霸', '江湖少侠'],
    description: '清爽明朗、意气风发，适合校园文、江湖初出茅庐小师弟',
    previewText: '仗剑天涯是我从小就立下的誓言，走，我们现在就出发！',
  },

  // 5. 特色动漫 / 灵动角色
  {
    id: 'zh_male_sunwukong_uranus_bigtts',
    name: '齐天大圣 2.0 (男声 · 灵动神话/戏剧猴哥)',
    gender: 'Male',
    category: 'anime',
    categoryName: '特色动漫',
    tags: ['神话西游', '动漫恶搞', '戏剧化'],
    description: '惟妙惟肖的美猴王音色，灵动桀骜、辨识度极高，适合神话玄幻与恶搞爽文',
    previewText: '呔！妖怪，吃俺老孙一棒！还不速速现出原形！',
  },
  {
    id: 'zh_female_xiaoxue_uranus_bigtts',
    name: '小雪 2.0 (女声 · 萌趣童声/绘本轻萌)',
    gender: 'Female',
    category: 'anime',
    categoryName: '特色动漫',
    tags: ['萌趣童声', '童话绘本', '萌宝甜宠'],
    description: '童真童趣、可爱生动，适合萌宝爽文、灵宠日常与童话小说',
    previewText: '哇，这个大蘑菇好漂亮呀，里面会不会住着小兔子呢？',
  },

  // 6. 外语多语 / 英文教学
  {
    id: 'zh_female_yingyujiaoxue_uranus_bigtts',
    name: 'Tina老师 2.0 (女声 · 双语教学/流利标准)',
    gender: 'Female',
    category: 'english',
    categoryName: '外语多语',
    tags: ['双语教学', '国际精英', '纯正发音'],
    description: '标准中英双语女声，音色优雅纯正，适合留学文、国际背景小说',
    previewText: 'Welcome to our class! 今天我们来学习一段地道的英语口语表达。',
  },
  {
    id: 'en_male_tim_uranus_bigtts',
    name: 'Tim 2.0 (英文 · 沉稳磁性美音男声)',
    gender: 'Male',
    category: 'english',
    categoryName: '外语多语',
    tags: ['美式英语', '男声播音', '科幻奇幻'],
    description: '沉稳自信的北美男声，适合奇幻翻译小说、英文原版听书',
    previewText: 'In the deep silence of the cosmos, a new star begins to shine with infinite light.',
  },
  {
    id: 'en_female_dacey_uranus_bigtts',
    name: 'Dacey 2.0 (英文 · 自然清新美音女声)',
    gender: 'Female',
    category: 'english',
    categoryName: '外语多语',
    tags: ['美式英语', '自然清新', '生活小说'],
    description: '温和自然的地道美音女声，适合现代英文小说与日常叙事',
    previewText: 'Every morning brings a new opportunity to write a completely different story.',
  },
  {
    id: 'en_female_stokie_uranus_bigtts',
    name: 'Stokie 2.0 (英文 · 典雅英伦女声)',
    gender: 'Female',
    category: 'english',
    categoryName: '外语多语',
    tags: ['英式发音', '优雅古典', '维多利亚风'],
    description: '典雅纯正的英式英语发音，适合中世纪奇幻、古典文学与贵族背景',
    previewText: 'The old manor stood gracefully under the twilight, preserving secrets of the past.',
  },
];

/**
 * 豆包语音合成统一调度入口
 * 优先调用火山引擎官方 Seed-TTS 2.0 (V3 HTTP) 接口，兼顾旧版音色兼容与自然语言指令
 */
export async function synthesizeDoubaoTTS(
  text: string,
  appid: string,
  token: string,
  options: DoubaoTTSOptions = {}
): Promise<Buffer> {
  let voice = options.voice || 'zh_female_vv_uranus_bigtts';
  const speed = options.speed || 1.0;
  const contextText = options.contextText;

  // 映射旧版音色ID到 TTS 2.0 对应音色
  if (voice.includes('shuangkuaisisi')) {
    voice = 'zh_female_shuangkuaisisi_uranus_bigtts';
  } else if (voice.includes('tianmei')) {
    voice = 'zh_female_tianmeixiaoyuan_uranus_bigtts';
  } else if (voice.includes('chunhou') || voice.includes('BV701') || voice.includes('BV107')) {
    voice = 'zh_male_m191_uranus_bigtts';
  } else if (voice.includes('BV123')) {
    voice = 'zh_male_taocheng_uranus_bigtts';
  } else if (!voice.includes('uranus')) {
    voice = 'zh_female_vv_uranus_bigtts';
  }

  // 调用火山引擎官方 V3 Seed-TTS 2.0 单向流式合成
  return await synthesizeDoubaoTTS2(text, appid, token, voice, speed, contextText);
}

/**
 * 火山引擎豆包语音大模型 2.0 (Seed-TTS 2.0) 核心合成实现
 * 接口协议：POST https://openspeech.bytedance.com/api/v3/tts/unidirectional
 * 协议头：X-Api-App-Key, X-Api-Access-Key, X-Api-Resource-Id: seed-tts-2.0
 */
async function synthesizeDoubaoTTS2(
  text: string,
  appid: string,
  token: string,
  voice: string,
  speed: number = 1.0,
  contextText?: string
): Promise<Buffer> {
  const reqid = crypto.randomUUID();

  const reqParams: Record<string, any> = {
    text: text,
    speaker: voice,
    speed_ratio: Math.max(0.5, Math.min(2.0, speed)),
    audio_config: {
      format: 'mp3',
      sample_rate: 24000,
    },
  };

  // 豆包 TTS 2.0 自然语言控制 (情绪、吵架、窃窃私语、东北话/四川话等方言指令)
  // 注意：火山引擎 Go 后端要求 additions 字段必须为 JSON 序列化字符串
  if (contextText && contextText.trim().length > 0) {
    reqParams.additions = JSON.stringify({
      context_texts: [contextText.trim()],
    });
  }

  const response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
    method: 'POST',
    headers: {
      'X-Api-App-Key': appid.trim(),
      'X-Api-Access-Key': token.trim(),
      'X-Api-Resource-Id': 'seed-tts-2.0',
      'X-Api-Request-Id': reqid,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      req_params: reqParams,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`豆包 TTS 2.0 HTTP ${response.status}: ${errText}`);
  }

  const rawText = await response.text();
  const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
  const audioChunks: Buffer[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.code === 0 && parsed.data) {
        audioChunks.push(Buffer.from(parsed.data, 'base64'));
      } else if (parsed.code && parsed.code !== 0 && parsed.code !== 20000000) {
        throw new Error(parsed.message || `错误码 ${parsed.code}`);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('错误码')) {
        throw e;
      }
    }
  }

  if (audioChunks.length === 0) {
    throw new Error('豆包 TTS 2.0 未返回有效音频数据');
  }

  return Buffer.concat(audioChunks);
}

