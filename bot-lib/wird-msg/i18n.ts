// نسخة مولَّدة بـ sync-lib.mjs من app/lib — لا تُعدَّل هنا؛ عدِّل المصدر في التطبيق ثم أعد التشغيل.
"use client";

/* العربية والإنجليزية. اللغة تُحفظ محليًا وتضبط اتجاه الصفحة؛ الافتراضي حسب لغة الجهاز */
export type Lang = "ar" | "en";
/** بديل الخادم لخطّاف React: لا اشتراك ولا إعادة رسم على Deno، تعيد اللقطة الحالية فحسب (useLang لا تُستدعى هناك أصلًا) */
function useSyncExternalStore<T>(_subscribe: (cb: () => void) => () => void, getSnapshot: () => T, _server?: () => T): T { return getSnapshot(); }
const D = {
  circles: ["حلقات", "Circles"],
  tree: ["الشجرة", "Tree"],
  women: ["نساء", "Female"],
  name: ["اسم الحلقة", "Circle name"],
  share: ["مشاركة", "Share"],
  next: ["التالي", "Next"],
  today: ["اليوم", "Today"],
  hzPg1: ["وجه", "face"],
  hzPg2: ["وجهان", "faces"],
  hzPgFew: ["أوجه", "faces"],
  hzPgMany: ["وجهًا", "faces"],
  hzJuz1: ["جزء", "juz"],
  hzJuz2: ["جزآن", "juz"],
  hzJuzFew: ["أجزاء", "juz"],
  hzJuzMany: ["جزءًا", "juz"],
  hzJuzShort: ["ج", "J"],
  hzStage0: ["ابدأ رحلة الحفظ", "Begin your memorization journey"],
  hzStage0F: ["ابدئي رحلة الحفظ", "Begin your memorization journey"],
  hzStage1: ["في الطريق", "On the way"],
  hzStage2: ["حافظ لخمسة أجزاء فأكثر", "Memorized five juz or more"],
  hzStage2F: ["حافظة لخمسة أجزاء فأكثر", "Memorized five juz or more"],
  hzStage3: ["حافظ لعشرة أجزاء فأكثر", "Memorized ten juz or more"],
  hzStage3F: ["حافظة لعشرة أجزاء فأكثر", "Memorized ten juz or more"],
  hzStage4: ["حافظ لعشرين جزءًا فأكثر", "Memorized twenty juz or more"],
  hzStage4F: ["حافظة لعشرين جزءًا فأكثر", "Memorized twenty juz or more"],
  hzStage5: ["حافظ لكتاب الله", "Hafiz of the Book of Allah"],
  hzStage5F: ["حافظة لكتاب الله", "Hafiza of the Book of Allah"],
  /* أسماء الحالات في خريطة العضو (قرار صاحب المشروع): لم يُحفظ · جديد · قريب · قديم · متقن · منسيّ — كلمةٌ واحدة، فلا اسم مختصر.
     «جديد» حالة عرضٍ لا تُخزَّن (lib/hifz.ts freshView): ما يحمله الورد جديدَ أسبوعه. والوصف (hzDs*) تحت خيارات الاختيار بلا مخاطَب،
     ويسمّي أقسام الورد بأسمائها التي تعتمدها شاشته في الخطوة التالية: الحفظ الجديد · مراجعة القريب · مراجعة القديم · استعادة المنسيّ */
  hzStNone: ["لم يُحفظ", "Not memorized"],
  hzStFresh: ["جديد", "New"],
  hzStNew: ["قريب", "Recent"],
  hzStRev: ["قديم", "Old"],
  hzStMas: ["متقن", "Mastered"],
  hzStOld: ["منسيّ", "Forgotten"],
  hzDsNone: ["لم يبدأ حفظه بعد", "Not started yet"],
  hzDsFresh: ["حُفظ هذا الأسبوع، ويصير قريبًا بنجاحه في اختبار الأسبوع.", "Memorized this week; it becomes recent when it passes the weekly test."],
  hzDsNew: ["حُفظ قريبًا، فيأتي كله كل يوم في «مراجعة القريب».", "Memorized recently; all of it comes every day in «Recent review»."],
  hzDsRev: ["نجح في اختبار الخروج، فيأتي في دورة «مراجعة القديم».", "Passed its exit test; it comes in the «Old review» cycle."],
  hzDsMas: ["يُقرأ غيبًا بلا تعثّر، ويبقى في دورة «مراجعة القديم».", "Recited from memory without stumbling; it stays in the «Old review» cycle."],
  hzDsOld: ["حُفظ من قبل ثم نُسي، فيأتي في «استعادة المنسيّ».", "Memorized before, then forgotten; it comes in «Restoring the forgotten»."],
  /* شرح الحالات: «؟» فوق جدول السور. سطرٌ لكل حالة بترتيب انتقال المحفوظ: أين يأتيك، ومتى ينتقل إلى ما بعده.
     «جديد» و«قديم» يضعهما الورد وحده (قرار صاحب المشروع في lib/hifz.ts)، و«متقن» إقرارٌ من العضو بما يحفظه جيدًا أو نتيجة
     دورتين سليمتين، ولا يكتبه الورد بضغطة «أتممت» (amend A) */
  wrTitle: ["ورد اليوم", "Today's wird"],
  wrCycleLine: ["اليوم {d} من دورة {n}", "Day {d} of a {n} cycle"],
  wrWeekLine: ["اليوم {d} من أسبوع الحفظ", "Day {d} of the memorization week"],
  wrWeekLineRe: ["اليوم {d} من الأسبوع المعاد", "Day {d} of the repeated week"],
  wrNew: ["الحفظ الجديد", "New memorization"],
  wrFix: ["مراجعة القريب", "Recent review"],
  wrReview: ["مراجعة القديم", "Old review"],
  wrRestore: ["استعادة المنسيّ", "Restoring the forgotten"],
  wrAya: ["آية {a}", "ayah {a}"],
  wrFromTo: ["من آية {a} إلى آية {b}", "from ayah {a} to ayah {b}"],
  wrX1: ["مرة", "once"],
  wrX2: ["مرتين", "twice"],
  wrX3: ["ثلاث مرات", "three times"],
  wrXTest: ["مرة، اختبار", "once, test"],
  wrLeadPrev1: ["قسط أمس", "Yesterday's portion"],
  wrLeadPrevN: ["الأقساط السابقة من أسبوعك", "The earlier portions of your week"],
  wrLeadPrevNF: ["الأقساط السابقة من أسبوعكِ", "The earlier portions of your week"],
  wrLeadNoPortion: ["لا قسط جديد اليوم. الأقساط السابقة من أسبوعك", "No new portion today. The earlier portions of your week"],
  wrLeadNoPortionF: ["لا قسط جديد اليوم. الأقساط السابقة من أسبوعكِ", "No new portion today. The earlier portions of your week"],
  wrLeadToday: ["قسط اليوم: تحفظه ثم تسمّعه ثلاث مرات متباعدة", "Today's portion: memorize it, then recite it from memory three spaced times"],
  wrLeadTodayF: ["قسط اليوم: تحفظينه ثم تسمّعينه ثلاث مرات متباعدة", "Today's portion: memorize it, then recite it from memory three spaced times"],
  wrLeadTodayRe: ["قسط اليوم: تعيد حفظه ثم تسمّعه ثلاث مرات متباعدة", "Today's portion: memorize it again, then recite it from memory three spaced times"],
  wrLeadTodayReF: ["قسط اليوم: تعيدين حفظه ثم تسمّعينه ثلاث مرات متباعدة", "Today's portion: memorize it again, then recite it from memory three spaced times"],
  wrLeadWeek: ["لا جديد اليوم. جديد الأسبوع كله", "No new today. All of this week's new"],
  wrLeadTest: ["لا جديد اليوم. اختبار الأسبوع، غيبًا", "No new today. The weekly test, from memory"],
  wrLeadYest: ["ثم مقدار أمس", "Then yesterday's amount"],
  wrLeadExit: ["اختبار الخروج، غيبًا", "The exit test, from memory"],
  wrRule1: ["تسمّع كل سطرٍ من حفظك، ثم تراجع من مصحفك أو مع معلمك أو مع رفيقك.", "Recite each line from memory, then check it in your mushaf, or with your teacher, or with your companion."],
  wrRule1F: ["تسمّعين كل سطرٍ من حفظك، ثم تراجعين من مصحفك أو مع معلمك أو مع رفيقك.", "Recite each line from memory, then check it in your mushaf, or with your teacher, or with your companion."],
  wrTestNote: ["ينجح إن خلا من الخطأ والتردد.", "It passes with no mistake and no hesitation."],
  wrExitNote: ["ينجح بخطأ واحد أو ترددين على الأكثر.", "It passes with at most one mistake or two hesitations."],
  treesPlantedN: ["شجرة أزهرت", "trees in blossom"],
  circlesStriving: ["حلقة تسعى الآن", "circles striving now"],
} satisfies Record<string, [string, string]>;
export type Key = keyof typeof D;

let lang: Lang = "ar";
const subs = new Set<() => void>();
function apply(l: Lang) { if (typeof document === "undefined") return; document.documentElement.lang = l; document.documentElement.dir = l === "ar" ? "rtl" : "ltr"; }
export function initLang() {
  try { const s = localStorage.getItem("ww-lang") as Lang | null; lang = s ?? (navigator.language?.startsWith("ar") ? "ar" : "en"); } catch {}
  apply(lang); subs.forEach((f) => f());
}
export function setLang(l: Lang) { lang = l; try { localStorage.setItem("ww-lang", l); } catch {} apply(l); subs.forEach((f) => f()); }
export function getLang() { return lang; }
export function t(k: Key) { return D[k][lang === "ar" ? 0 : 1]; }
/** أرقام: عربية هندية بالعربية، ولاتينية بالإنجليزية */
export const num = (n: number) => n.toLocaleString(lang === "ar" ? "ar-EG" : "en-US");
/** صيغة المؤنث إن وُجدت (المفتاح + F) وكانت الحلقة نسائية */
export const tg = (k: Key, women: boolean) => women && (k + "F") in D ? t((k + "F") as Key) : t(k);
/** العدد مع معدوده: واحد، مثنى، ٣–١٠ جمع، ١١+ مفرد منصوب؛ وبالإنجليزية مفرد/جمع */
export const plural = (n: number, one: string, two: string, few: string, many: string, en: [string, string]) =>
  lang === "ar" ? (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${num(n)} ${few}` : `${num(n)} ${many}`) : `${n} ${n === 1 ? en[0] : en[1]}`;
export const circlesN = (n: number) => plural(n, "حلقة واحدة", "حلقتان", "حلقات", "حلقة", ["circle", "circles"]);
/** الصفحات مفعولًا به في جملة الهدف: «قراءة صفحتين يوميًا» · «قراءة ١٠ صفحات يوميًا» · «قراءة ١٥ صفحة يوميًا» */
export const pagesAcc = (n: number) => plural(n, "صفحة", "صفحتين", "صفحات", "صفحة", ["page", "pages"]);
export const daysN = (n: number) => plural(n, "يوم واحد", "يومان", "أيام", "يومًا", ["day", "days"]);
/** الأيام مجرورةً بعد حرف جرّ أو مضافٍ أو معطوفةً على مجرور («ويومين بعده»، «من دورة يومين»): يوم · يومين · ٣ أيام · ١١ يومًا،
    لا «٢ يومان» ولا «١ يوم». نصوصٌ حرفية لا مفاتيح: البوت (wirdMsg) يقرؤها ولا يُقصّ منها شيءٌ من قاموسه */
export const daysGen = (n: number) => plural(n, "يوم", "يومين", "أيام", "يومًا", ["day", "days"]);
/** المقاعد المتبقية بالمطابقة العددية: مكان واحد متبقٍ · مكانان · ٣ أماكن متبقية · ١١ مكانًا متبقيًا */
export const seatsCountN = (n: number) => plural(n, "مقعد واحد", "مقعدان", "مقاعد", "مقعدًا", ["seat", "seats"]);
export const seatsN = (n: number) => plural(n, "مكان واحد متبقٍ", "مكانان متبقيان", "أماكن متبقية", "مكانًا متبقيًا", ["seat left", "seats left"]);
/** المعدود وحده (لبطاقات الأرقام الكبيرة): حلقة · حلقتان · حلقات · حلقة */
export const circleNoun = (n: number) => lang === "ar" ? (n === 1 ? "حلقة" : n === 2 ? "حلقتان" : n >= 3 && n <= 10 ? "حلقات" : "حلقة") : n === 1 ? "circle" : "circles";
/** معدود الأيام وحده (بجوار رقم كبير): يوم · يومان · أيام · يومًا */
export const dayNoun = (n: number) => lang === "ar" ? (n === 1 ? "يوم" : n === 2 ? "يومان" : n >= 3 && n <= 10 ? "أيام" : "يومًا") : n === 1 ? "day" : "days";
/** معدود أشجار البستان وحده (شريحة البستان): شجرة · شجرتان · أشجار · شجرة. الاسم القديم باقٍ كي لا تتغير مواضع الاستعمال */
export const sidrNoun = (n: number) => lang === "ar" ? (n === 2 ? "شجرتان" : n >= 3 && n <= 10 ? "أشجار" : "شجرة") : n === 1 ? "tree" : "trees";
/** وصف الرقم الكبير في رأس البستان: شجرة أزهرت · شجرتان أزهرتا · أشجار أزهرت · شجرة أزهرت */
export const treesPlantedWord = (n: number) => lang === "ar" ? (n === 2 ? "شجرتان أزهرتا" : n >= 3 && n <= 10 ? "أشجار أزهرت" : t("treesPlantedN")) : n === 1 ? "tree in blossom" : t("treesPlantedN");
/** العدد مع وصفه في سطر واحد: شجرة واحدة أزهرت · شجرتان أزهرتا · ٥ أشجار أزهرت · ٣٦ شجرة أزهرت */
export const plantedCountN = (n: number) => lang === "ar" && n <= 2 && n >= 1 ? (n === 1 ? "شجرة واحدة أزهرت" : "شجرتان أزهرتا") : `${num(n)} ${treesPlantedWord(n)}`;
/** مجموع الإنجازات بمعدوده: إنجاز واحد · إنجازان · ٥ إنجازات · ٥٢٧٥ إنجازًا */
export const doneTotalN = (n: number) => lang === "ar" ? plural(n, "إنجاز واحد", "إنجازان", "إنجازات", "إنجازًا", ["", ""]) : `${num(n)} ${n === 1 ? "check-in" : "check-ins"}`;
/** الحلقات الساعية الآن: حلقة واحدة تسعى الآن · حلقتان تسعيان الآن · ٤ حلقات تسعى الآن · ١٢ حلقة تسعى الآن */
export const strivingN = (n: number) => lang === "ar"
  ? (n === 1 ? "حلقة واحدة تسعى الآن" : n === 2 ? "حلقتان تسعيان الآن" : n >= 3 && n <= 10 ? `${num(n)} حلقات تسعى الآن` : `${num(n)} ${t("circlesStriving")}`)
  : `${n} ${n === 1 ? "circle striving now" : t("circlesStriving")}`;
export function useLang() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => lang, () => "ar" as Lang);
}
