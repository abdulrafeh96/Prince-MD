// ============================================
//      Prince Md - UTILS/AUTOSCHEDULER.JS
//      Auto Open/Close Scheduler
// ============================================

'use strict';

const fs = require('fs');
const path = require('path');

const db = require('../database/db');
const logger = require('./logger');

const AUTO_SCHEDULE_FILE = path.join(__dirname, '../autogroup-schedules.json');
const AUTO_GROUP_TIMEZONE = 'Asia/Karachi';

const DAROOD_SHAREEF =
  'اللهم صل على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد، اللهم بارك على محمد وعلى آل محمد كما باركت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد';

const SLEEP_DUA =
  'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا';

const OPEN_HADITHS = [
  {
    ar: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
    ur: 'اعمال کا دارومدار نیتوں پر ہے۔',
    ref: 'صحیح البخاری، صحیح مسلم',
  },
  {
    ar: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    ur: 'تم میں بہترین وہ ہے جو قرآن سیکھے اور سکھائے۔',
    ref: 'صحیح البخاری',
  },
  {
    ar: 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
    ur: 'تم میں سے کوئی کامل مومن نہیں ہو سکتا جب تک اپنے بھائی کے لیے وہی پسند نہ کرے جو اپنے لیے پسند کرتا ہے۔',
    ref: 'صحیح البخاری، صحیح مسلم',
  },
  {
    ar: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ',
    ur: 'اپنے بھائی کے سامنے مسکرانا بھی صدقہ ہے۔',
    ref: 'جامع الترمذی',
  },
  {
    ar: 'إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ',
    ur: 'بے شک اللہ نرمی کرنے والا ہے اور نرمی کو پسند فرماتا ہے۔',
    ref: 'صحیح مسلم',
  },
  {
    ar: 'يَسِّرُوا وَلاَ تُعَسِّرُوا',
    ur: 'آسانی کرو، مشکل نہ بناؤ۔',
    ref: 'صحیح البخاری، صحیح مسلم',
  },
  {
    ar: 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ',
    ur: 'طاقتور وہ نہیں جو پچھاڑ دے، طاقتور وہ ہے جو غصے کے وقت خود پر قابو رکھے۔',
    ref: 'صحیح البخاری، صحیح مسلم',
  },
];

const CLOSE_HADITHS = [
  {
    ar: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ',
    ur: 'جو اللہ اور آخرت کے دن پر ایمان رکھتا ہے اسے چاہیے کہ اچھی بات کہے یا خاموش رہے۔',
    ref: 'صحیح البخاری، صحیح مسلم',
  },
  {
    ar: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
    ur: 'مسلمان وہ ہے جس کی زبان اور ہاتھ سے دوسرے مسلمان محفوظ رہیں۔',
    ref: 'صحیح البخاری، صحیح مسلم',
  },
  {
    ar: 'الطُّهُورُ شَطْرُ الإِيمَانِ',
    ur: 'پاکیزگی ایمان کا حصہ ہے۔',
    ref: 'صحیح مسلم',
  },
  {
    ar: 'أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ',
    ur: 'اللہ کے نزدیک محبوب ترین عمل وہ ہے جو پابندی سے کیا جائے، اگرچہ تھوڑا ہو۔',
    ref: 'صحیح البخاری، صحیح مسلم',
  },
  {
    ar: 'إِنَّ اللَّهَ لاَ يَنْظُرُ إِلَى صُوَرِكُمْ وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ',
    ur: 'اللہ تمہاری شکلوں کو نہیں بلکہ تمہارے دلوں اور اعمال کو دیکھتا ہے۔',
    ref: 'صحیح مسلم',
  },
  {
    ar: 'خِيَارُكُمْ أَحَاسِنُكُمْ أَخْلاَقًا',
    ur: 'تم میں بہترین وہ ہیں جن کے اخلاق سب سے اچھے ہیں۔',
    ref: 'صحیح البخاری',
  },
  {
    ar: 'الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ',
    ur: 'اچھی بات صدقہ ہے۔',
    ref: 'صحیح البخاری، صحیح مسلم',
  },
];

class AutoScheduler {
  constructor(sock, botNum) {
    this.sock = sock;
    this.botNum = botNum;
    this.cleanBotNum = botNum.replace(/[^0-9]/g, '');
    this.checkInterval = null;
    this.autoGroupSchedules = new Map();
    this.loadAutoGroupSchedules();
  }

  getTimePartsInZone(date = new Date(), timeZone = AUTO_GROUP_TIMEZONE) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const pick = (type) => parts.find((p) => p.type === type)?.value || '00';
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    const hour = pick('hour');
    const minute = pick('minute');

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
      hour,
      minute,
    };
  }

  toMinutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return (h * 60) + m;
  }

  pickDaily(items, groupJid, date, type) {
    const seed = `${groupJid}:${date}:${type}`;
    const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return items[total % items.length];
  }

  formatHadith(hadith) {
    return [
      hadith.ar,
      `ترجمہ: ${hadith.ur}`,
      `حوالہ: ${hadith.ref}`,
    ].join('\n');
  }

  getMorningHadiths() {
    return [
      {
        ar: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
        ur: 'تم میں سب سے بہتر وہ شخص ہے جو قرآن سیکھے اور پھر دوسروں کو سکھائے۔ اس حدیث میں علمِ قرآن سیکھنے، سمجھنے اور آگے پہنچانے کی فضیلت بیان ہوئی ہے۔',
        ref: 'صحیح البخاری، کتاب فضائل القرآن، باب: تم میں بہتر وہ ہے جو قرآن سیکھے اور سکھائے، حدیث نمبر: 5027',
      },
      {
        ar: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
        ur: 'اعمال کا دارومدار نیتوں پر ہے، اور ہر انسان کو وہی ملے گا جس کی اس نے نیت کی۔ اس لیے ہر دن کا آغاز صاف نیت، حلال محنت اور اللہ کی رضا کے ارادے سے کرو۔',
        ref: 'صحیح البخاری، کتاب بدء الوحی، باب: رسول اللہ ﷺ پر وحی کی ابتدا کیسے ہوئی، حدیث نمبر: 1؛ صحیح مسلم، کتاب الامارۃ، باب: اعمال کا دارومدار نیت پر ہے، حدیث نمبر: 1907',
      },
      {
        ar: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ',
        ur: 'جو اللہ اور آخرت کے دن پر ایمان رکھتا ہے، اسے چاہیے کہ اچھی بات کہے یا خاموش رہے۔ زبان کی حفاظت دین کی بڑی آداب میں سے ہے۔',
        ref: 'صحیح البخاری، کتاب الادب، باب: جو اللہ اور آخرت پر ایمان رکھتا ہو وہ اچھی بات کہے، حدیث نمبر: 6018؛ صحیح مسلم، کتاب الایمان، باب: مہمان، پڑوسی اور خاموشی کے آداب، حدیث نمبر: 47',
      },
      {
        ar: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
        ur: 'مسلمان وہ ہے جس کی زبان اور ہاتھ سے دوسرے مسلمان محفوظ رہیں۔ اس حدیث میں اخلاق، امن اور دوسروں کو تکلیف نہ دینے کی بنیادی تعلیم ہے۔',
        ref: 'صحیح البخاری، کتاب الایمان، باب: مسلمان وہ ہے جس کی زبان اور ہاتھ سے مسلمان محفوظ رہیں، حدیث نمبر: 10؛ صحیح مسلم، کتاب الایمان، باب: اسلام کی خوبیوں کا بیان، حدیث نمبر: 40',
      },
      {
        ar: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
        ur: 'تم میں سے کوئی شخص کامل مومن نہیں ہوتا جب تک اپنے بھائی کے لیے وہی پسند نہ کرے جو اپنے لیے پسند کرتا ہے۔ یہ حدیث انصاف، محبت اور خیر خواہی کا دروازہ کھولتی ہے۔',
        ref: 'صحیح البخاری، کتاب الایمان، باب: اپنے بھائی کے لیے وہی پسند کرنا جو اپنے لیے پسند کرے، حدیث نمبر: 13؛ صحیح مسلم، کتاب الایمان، باب: کامل ایمان کی صفات، حدیث نمبر: 45',
      },
      {
        ar: 'إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ فِي الْأَمْرِ كُلِّهِ',
        ur: 'بے شک اللہ نرمی فرمانے والا ہے اور ہر کام میں نرمی کو پسند فرماتا ہے۔ اپنے گھر، دوستوں، گروپ اور روزمرہ گفتگو میں نرمی اختیار کرنا عبادت کے حسن میں سے ہے۔',
        ref: 'صحیح البخاری، کتاب استتابۃ المرتدین والمعاندین وقتالہم، باب: نرمی کا بیان، حدیث نمبر: 6927؛ صحیح مسلم، کتاب البر والصلۃ والآداب، باب: نرمی کی فضیلت، حدیث نمبر: 2165',
      },
      {
        ar: 'أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ',
        ur: 'اللہ کے نزدیک سب سے محبوب عمل وہ ہے جو پابندی سے کیا جائے، چاہے وہ تھوڑا ہی ہو۔ روزانہ چھوٹی نیکی، ذکر، درود اور بہتری کی کوشش انسان کو اللہ کے قریب کرتی ہے۔',
        ref: 'صحیح البخاری، کتاب الرقاق، باب: پسندیدہ عمل وہ ہے جو ہمیشہ کیا جائے، حدیث نمبر: 6465؛ صحیح مسلم، کتاب صلاۃ المسافرین وقصرہا، باب: عمل میں میانہ روی اور دوام، حدیث نمبر: 783',
      },
      {
        ar: 'الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ',
        ur: 'اچھی بات بھی صدقہ ہے۔ صبح کا ایک پیارا جملہ، کسی کی ہمت افزائی، سلام کا جواب اور نرم لہجہ بھی نیکی بن سکتا ہے۔',
        ref: 'صحیح البخاری، کتاب الجہاد والسیر، باب: اچھی بات صدقہ ہے، حدیث نمبر: 2989؛ صحیح مسلم، کتاب الزکاۃ، باب: ہر نیکی صدقہ ہے، حدیث نمبر: 1009',
      },
      {
        ar: 'يَسِّرُوا وَلَا تُعَسِّرُوا، وَبَشِّرُوا وَلَا تُنَفِّرُوا',
        ur: 'آسانی پیدا کرو، مشکل نہ بناؤ؛ خوشخبری دو، نفرت نہ دلاؤ۔ دین کا مزاج رحمت، حکمت اور آسانی ہے، اس لیے اپنے رویے سے لوگوں کے لیے راستہ ہلکا کرو۔',
        ref: 'صحیح البخاری، کتاب العلم، باب: نبی ﷺ کا تعلیم میں آسانی کا حکم، حدیث نمبر: 69؛ صحیح مسلم، کتاب الجہاد والسیر، باب: آسانی کرنے اور نفرت نہ دلانے کا حکم، حدیث نمبر: 1734',
      },
      {
        ar: 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ',
        ur: 'طاقتور وہ نہیں جو کسی کو پچھاڑ دے، بلکہ طاقتور وہ ہے جو غصے کے وقت اپنے نفس پر قابو رکھے۔ دن کا آغاز صبر اور حلم کے ارادے سے کرنا مومن کی شان ہے۔',
        ref: 'صحیح البخاری، کتاب الادب، باب: غصے سے بچنے کا بیان، حدیث نمبر: 6114؛ صحیح مسلم، کتاب البر والصلۃ والآداب، باب: غصے کے وقت نفس پر قابو، حدیث نمبر: 2609',
      },
      {
        ar: 'إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ، وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ',
        ur: 'اللہ تمہاری شکلوں اور مال کو نہیں دیکھتا، بلکہ تمہارے دلوں اور اعمال کو دیکھتا ہے۔ اس لیے دل کی صفائی، اخلاص اور عمل کی بہتری پر توجہ دو۔',
        ref: 'صحیح مسلم، کتاب البر والصلۃ والآداب، باب: دل اور اعمال کا اعتبار، حدیث نمبر: 2564',
      },
      {
        ar: 'الدِّينُ النَّصِيحَةُ',
        ur: 'دین خیر خواہی کا نام ہے۔ اپنے لیے، گھر والوں کے لیے، دوستوں کے لیے اور امت کے لیے سچی بھلائی چاہنا ایمان کی خوبصورت علامت ہے۔',
        ref: 'صحیح مسلم، کتاب الایمان، باب: دین خیر خواہی ہے، حدیث نمبر: 55',
      },
    ];
  }

  buildNewOpenMessage(groupJid, date) {
    const dailyHadith = this.pickDaily(this.getMorningHadiths(), groupJid, date, 'morning-hadith');

    return [
      '〔 ☀️🌈 𝗚𝗢𝗢𝗗 𝗠𝗢𝗥𝗡𝗜𝗡𝗚 〕',
      '⏰ 𝐆𝐫𝐨𝐮𝐩 *is now* 🔓 𝐎𝐩𝐞𝐧',
      '',
      '',
      '                `ˢᵗᵃʳᵗ ʸᵒᵘʳ ᵈᵃʸ ʷⁱᵗʰ ᵈᵘʳᵒᵒᵈ ᵖᵃᵏ`',
      '',
      '',
      '*_بِــــسْمِ اللّٰهِ الرَّحــمٰنِ الرَّحِيْــم_*🌕💗',
      '',
      '*_ﺍﻟـﻠّٰـﻬُﻢَّ ﺻَـﻞِّ عَلٰی ﻣُﺤَﻤَّـــﺪٍ ﻭَعَلٰی ﺁﻝ ِﻣُﺤَﻤَّـــﺪٍ ﻛَـﻤَـﺎ ﺻَـﻠَّـﻴْـﺖَ عَلٰی ﺇِﺑْـﺮَﺍﻫِـﻴـﻢَ وعَلٰیﺁﻝِ ﺇِﺑْـــﺮَﺍﻫِـــﻳـــﻢَ ﺇِﻧَّــــــــــﻚَ ﺣَﻤِﻴـﺪٌ ﻣَﺠِﻴــﺪٌ-_༘⋆🌷🫧💭🪄₊˚ෆ*',
      '',
      ' *_ﺍﻟـﻠّٰـﻬُـﻢَّ ﺑَـﺎﺭِﻙْ عَلٰی ﻣُﺤَـــﻤَّﺪٍ ﻭَعَلٰیﺁﻝ ِﻣُﺤَـــﻤَّﺪٍ ﻛَـﻤَـﺎ ﺑَـﺎﺭَﻛْـﺖَ عَلٰی ﺇِﺑْــﺮَﺍﻫِــﻴــﻢَ وعَلٰیﺁﻝِ ﺇِﺑْــﺮَﺍﻫِــﻴــﻢَ ﺇِﻧَّــــــــــﻚَ ﺣَﻤِـﻴـﺪٌ ﻣَﺠِﻴــﺪٌ-_*˖𓍢ִ໋🌈͙֒✧˚.🌊✨༘',
      '',
      '*📖 حدیث شریف:*',
      `*${dailyHadith.ar}*`,
      `*ترجمہ:* _${dailyHadith.ur}_`,
      `*حوالہ:* ${dailyHadith.ref}`,
      '',
      '⋆｡‧˚ʚɞ˚‧｡⋆🤍🌻🌊🍄‍🟫',
    ].join('\n');
  }

  buildNewCloseMessage() {
    return [
      '〔 🌙✨ 𝗚𝗢𝗢𝗗 𝗡𝗜𝗚𝗛𝗧 〕',
      '⏰ 𝐆𝐫𝐨𝐮𝐩 *is now* 🔒 𝐂𝐥𝐨𝐬𝐞𝐝',
      '',
      '',
      '**بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْم** 🌙🤍',
      '',
      '**اَلَا بِذِكْرِ اللّٰهِ تَطْمَئِنُّ الْقُلُوْبُ**',
      '*“Indeed, in the remembrance of Allah do hearts find peace.”* 🤍✨',
      '— *(Surah Ar-Ra’d 13:28)*',
      '',
      '**اللّٰهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا** 🌌💫',
      '',
      '**اَللّٰهُمَّ احْفَظْنَا طُوْلَ اللَّيْلِ وَارْزُقْنَا نَوْمًا هَادِئًا وَقَلْبًا مُطْمَئِنًّا** 🤲🏻🌷',
      '',
      '⋆｡‧˚ʚɞ˚‧｡⋆🌙⭐☁️🕊️',
    ].join('\n');
  }

  buildOpenMessage(groupJid, date, time) {
    return this.buildNewOpenMessage(groupJid, date);

    const morningHadiths = [
      {
        ar: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
        ur: "Tum mein sab se behtar woh hai jo Qur'an seekhe aur sikhaye.",
        ref: 'Sahih al-Bukhari 5027',
      },
      {
        ar: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
        ur: 'Amaal ka daromadar niyyaton par hai.',
        ref: 'Sahih al-Bukhari 1, Sahih Muslim 1907',
      },
      {
        ar: 'الدِّينُ النَّصِيحَةُ',
        ur: 'Deen khair khwahi ka naam hai.',
        ref: 'Sahih Muslim 55',
      },
      {
        ar: 'الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ',
        ur: 'Achhi baat bhi sadaqah hai.',
        ref: 'Sahih al-Bukhari 2989, Sahih Muslim 1009',
      },
      {
        ar: 'يَسِّرُوا وَلَا تُعَسِّرُوا',
        ur: 'Aasani paida karo aur mushkil na banao.',
        ref: 'Sahih al-Bukhari 69, Sahih Muslim 1734',
      },
    ];
    const randomHadith = morningHadiths[Math.floor(Math.random() * morningHadiths.length)];

    return [
      `┏━━━〔 *Good   Morning* 〕━━━┓`,
      ``,
      `*Assalam-o-Alaikum!*`,
      `Allah Ta'ala aap ke din mein`,
      `khair, barkat aur asani farmaye.`,
      `*Ameen!*`,
      ``,
      `*ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ ٱلنُّشُورُ*`,
      `_Saari tareef Allah ke liye hai jis ne humein maut (neend) ke baad dobara zinda kiya, aur usi ki taraf wapas jaana hai._`,
      ``,
      `*Darood Shareef:*`,
      `اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ وَّعَلٰى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلٰى اِبْرَاهِيْمَ وَعَلٰى آلِ اِبْرَاهِيْمَ اِنَّكَ حَمِيْدٌ مَّجِيْدٌ`,
      `اَللّٰهُمَّ بَارِكْ عَلٰى مُحَمَّدٍ وَّعَلٰى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلٰى اِبْرَاهِيْمَ وَعَلٰى آلِ اِبْرَاهِيْمَ اِنَّكَ حَمِيْدٌ مَّجِيْدٌ`,
      ``,
      `*Hadees Shareef:*`,
      randomHadith.ar,
      `_${randomHadith.ur}_`,
      `*Reference:* ${randomHadith.ref}`,
      ``,
      `*The group is now open.*`,
    ].join('\n');

    const hadith = this.pickDaily(OPEN_HADITHS, groupJid, date, 'open');
    return [
      `گروپ کھول دیا گیا ہے۔`,
      `اب سب ممبرز میسج کر سکتے ہیں۔`,
      ``,
      `حدیث مبارک:`,
      this.formatHadith(hadith),
      ``,
      `درود شریف:`,
      DAROOD_SHAREEF,
      ``,
      `وقت: ${time} (${AUTO_GROUP_TIMEZONE})`,
    ].join('\n');
  }

  buildCloseMessage(groupJid, date, time) {
    return this.buildNewCloseMessage();

    return [
      `┏━━━〔  *Good  -  Night*  〕━━━┓`,
      ``,
      `*Raat ki Khamoshi ka Waqt*`,
      ``,
      `📿 Group ab band ho raha hai`,
      `🕌 Is waqt Allah ka zikar karen`,
      `🤲 Apne gunahon ki maafi mangen`,
      `📖 Sote waqt Ayat-ul-Kursi parhen`,
      ``,
      `*اَللّٰهُمَّ بِاسْمِكَ اَمُوْتُ وَاَحْيَا*`,
      `_(Ae Allah! Teray hi naam se marta aur jita hun)_`,
      ``,
      `🌟 Subah phir milenge, Insha'Allah`,
      `🔒 *Group Closed for Night*`,
      ``,
      `خدا حافظ 💫`,
    ].join('\n');

    const hadith = this.pickDaily(CLOSE_HADITHS, groupJid, date, 'close');
    return [
      `گروپ بند کر دیا گیا ہے۔`,
      `اب صرف ایڈمنز میسج کر سکتے ہیں۔`,
      ``,
      `حدیث مبارک:`,
      this.formatHadith(hadith),
      ``,
      `سونے کی دعا:`,
      SLEEP_DUA,
      ``,
      `وقت: ${time} (${AUTO_GROUP_TIMEZONE})`,
    ].join('\n');
  }

  loadAutoGroupSchedules() {
    try {
      if (!fs.existsSync(AUTO_SCHEDULE_FILE)) return;
      const raw = fs.readFileSync(AUTO_SCHEDULE_FILE, 'utf8');
      if (!raw.trim()) return;

      const parsed = JSON.parse(raw);
      for (const [groupJid, schedule] of Object.entries(parsed)) {
        this.autoGroupSchedules.set(groupJid, schedule);
      }

      logger.info(`Loaded ${this.autoGroupSchedules.size} auto group schedule(s).`);
    } catch (err) {
      logger.error('Failed to load auto group schedules:', err?.message || err);
    }
  }

  saveAutoGroupSchedules() {
    try {
      const json = Object.fromEntries(this.autoGroupSchedules.entries());
      fs.writeFileSync(AUTO_SCHEDULE_FILE, JSON.stringify(json, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to save auto group schedules:', err?.message || err);
    }
  }

  async updateGroupMessagePermission(groupJid, closeGroup) {
    const modes = closeGroup
      ? ['announcement', 'locked']
      : ['not_announcement', 'unlocked'];

    let lastError;
    for (const mode of modes) {
      try {
        await this.sock.groupSettingUpdate(groupJid, mode);
        return mode;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to update group setting');
  }

  start() {
    if (this.checkInterval) clearInterval(this.checkInterval);

    this.checkInterval = setInterval(() => {
      this.checkAllAutoTimes();
    }, 15000);

    logger.info('Auto scheduler started');
  }

  stop() {
    if (!this.checkInterval) return;
    clearInterval(this.checkInterval);
    this.checkInterval = null;
    logger.info('Auto scheduler stopped');
  }

  async checkAllAutoTimes() {
    try {
      this.syncSchedulesFromDB();
      if (this.autoGroupSchedules.size === 0) return;

      const nowInZone = this.getTimePartsInZone(new Date(), AUTO_GROUP_TIMEZONE);
      const today = nowInZone.date;
      const currentTime = nowInZone.time;

      for (const [groupJid, schedule] of this.autoGroupSchedules.entries()) {
        try {
          const closeMinutes = this.toMinutes(schedule.closeTime);
          const openMinutes = this.toMinutes(schedule.openTime);

          if (closeMinutes !== null && currentTime === schedule.closeTime && schedule.lastCloseDate !== today) {
            await this.updateGroupMessagePermission(groupJid, true);
            schedule.lastCloseDate = today;
            schedule.lastAppliedState = 'closed';
            this.saveAutoGroupSchedules();
            await this.sock.sendMessage(groupJid, {
              text: this.buildCloseMessage(groupJid, today, currentTime),
            });
            logger.info(`Group ${groupJid} closed at ${currentTime}`);
          }

          if (openMinutes !== null && currentTime === schedule.openTime && schedule.lastOpenDate !== today) {
            await this.updateGroupMessagePermission(groupJid, false);
            schedule.lastOpenDate = today;
            schedule.lastAppliedState = 'open';
            this.saveAutoGroupSchedules();
            await this.sock.sendMessage(groupJid, {
              text: this.buildOpenMessage(groupJid, today, currentTime),
            });
            logger.info(`Group ${groupJid} opened at ${currentTime}`);
          }
        } catch (err) {
          logger.error(`Auto schedule error in ${groupJid}:`, err?.message || err);
        }
      }
    } catch (error) {
      logger.error('Auto scheduler error:', error.message);
    }
  }

  syncSchedulesFromDB() {
    try {
      const autoTimes = db.getAllAutoTimes(this.cleanBotNum);
      const activeGroups = new Set(Object.keys(autoTimes));

      for (const [groupJid, times] of Object.entries(autoTimes)) {
        const existing = this.autoGroupSchedules.get(groupJid) || {};
        this.autoGroupSchedules.set(groupJid, {
          openTime: times.autoOpenTime || null,
          closeTime: times.autoCloseTime || null,
          lastOpenDate: existing.lastOpenDate || null,
          lastCloseDate: existing.lastCloseDate || null,
          lastAppliedState: existing.lastAppliedState || null,
        });
      }

      for (const groupJid of [...this.autoGroupSchedules.keys()]) {
        if (!activeGroups.has(groupJid)) {
          this.autoGroupSchedules.delete(groupJid);
        }
      }

      this.saveAutoGroupSchedules();
    } catch (err) {
      logger.error('Failed to sync schedules from DB:', err.message);
    }
  }

  async checkNow(groupJid = null) {
    if (!groupJid) {
      await this.checkAllAutoTimes();
      return;
    }

    const schedule = this.autoGroupSchedules.get(groupJid);
    if (!schedule) return;

    const nowInZone = this.getTimePartsInZone(new Date(), AUTO_GROUP_TIMEZONE);
    const currentMinutes = this.toMinutes(nowInZone.time);
    const closeMinutes = this.toMinutes(schedule.closeTime);
    const openMinutes = this.toMinutes(schedule.openTime);

    if (closeMinutes === null || openMinutes === null) return;

    const shouldBeClosed = closeMinutes > openMinutes
      ? (currentMinutes >= closeMinutes || currentMinutes < openMinutes)
      : (currentMinutes >= closeMinutes && currentMinutes < openMinutes);

    if (shouldBeClosed) {
      await this.updateGroupMessagePermission(groupJid, true);
      await this.sock.sendMessage(groupJid, {
        text: this.buildCloseMessage(groupJid, nowInZone.date, nowInZone.time),
      });
    } else {
      await this.updateGroupMessagePermission(groupJid, false);
      await this.sock.sendMessage(groupJid, {
        text: this.buildOpenMessage(groupJid, nowInZone.date, nowInZone.time),
      });
    }
  }
}

module.exports = AutoScheduler;
