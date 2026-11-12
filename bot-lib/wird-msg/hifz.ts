// نسخة مولَّدة بـ sync-lib.mjs من app/lib — لا تُعدَّل هنا؛ عدِّل المصدر في التطبيق ثم أعد التشغيل.
import { JUZ, PAGES, SURAHS, TOTAL_PAGES } from "./quran-data.ts";
import { getLang, num, t, tg, type Key } from "./i18n.ts";

/* الحفظ (دوال صافية بلا شبكة): حالة كل سورة، ومجاميع الصفحات بكسورها، ومكافئ الأجزاء والمرحلة بنفس قاعدة
   الخادم (hifz_stats)، وأي السور تقع كاملة داخل كل جزء.
   محور الصفحات متصل واحد مصدره جدول PAGES: الصفحة p تشغل [p، p+1) وآياتها متساوية فيها. السورة n تشغل
   [POS[n], POS[n+1]) حيث POS[n] موضع أول آيةٍ منها على هذا المحور، فالسور تتلاصق بلا ثغرة ولا تداخل وينتهي
   المحور عند TOTAL_PAGES + 1 تمامًا. والجزء j يشغل [موضع أول آيةٍ منه، موضع أول آيةٍ من التالي) — فأكثر الأجزاء
   تبدأ بأول صفحة، وثلاثة (٤ و٧ و١١) تبدأ وسط صفحة في مصحف المدينة فتُحسب من آيتها لا من رأس الصفحة. */
export type HifzStatus = "none" | "old_review" | "new_fix" | "reviewing" | "mastered";
/** حالة كل سورة بالرقم؛ الغائب = لم يُحفظ. السورة المقسّمة تحمل هنا حالتها الغالبة (الأكثر صفحات) وتفصيلها في BandsMapT */
export type HifzMapT = Partial<Record<number, HifzStatus>>;
/** جزء محفوظ من سورة: [من، إلى، الحالة] بكسر من صفحات السورة (٠..١) على محور الصفحات من أولها؛ الحالة إحدى الأربع (لا «لم يُحفظ») */
export type Band = [number, number, Exclude<HifzStatus, "none">];
/** السور المحفوظة جزئيًا أو بأكثر من حالة: أجزاؤها مرتّبة غير متداخلة؛ الغائب = السورة كلها بحالتها في HifzMapT */
export type BandsMapT = Partial<Record<number, Band[]>>;
export type ByStatus = Record<HifzStatus, number>;
/** حالة عرضٍ لا تُخزَّن: «جديد» (fresh) هو ما يحمله الورد جديدَ أسبوعه مما في المخزن «قريب» (new_fix). يشتقّها freshView من مدَيات الورد
    (lib/wird.ts freshSpans) للرسم وحده. ليست في STATUSES فيرفضها isStatus، ولا تقبلها Band ولا Entry ولا paint ولا withEntries */
export type ShowStatus = HifzStatus | "fresh";
type ShowMem = Exclude<ShowStatus, "none">;
export type ShowBand = [number, number, ShowMem];
export type ShowMapT = Partial<Record<number, ShowStatus>>;
export type ShowBandsT = Partial<Record<number, ShowBand[]>>;
export type ShowBy = Record<ShowStatus, number>;
/** الخريطة كما تُرسم لصاحبها: map وbands وفيهما «جديد» */
export type ShowView = { map: ShowMapT; bands: ShowBandsT };

export const STATUSES: HifzStatus[] = ["none", "old_review", "new_fix", "reviewing", "mastered"];
/** الحالات المحفوظة (للبحث والتحقق؛ العرض بـ SHOW_ORDER) */
export const MEM_ORDER: HifzStatus[] = ["old_review", "new_fix", "reviewing", "mastered"];
/** ترتيب مقاطع الشريط من البداية: متقن ثم قديم ثم قريب ثم منسيّ. يبقى لصفوف الحلقة (أرقام الخادم بلا «جديد») */
export const BAR_ORDER: HifzStatus[] = ["mastered", "reviewing", "new_fix", "old_review"];
/** مفتاح الألوان والقوائم على خريطة العضو نفسه: بترتيب انتقال المحفوظ (جديد ثم قريب ثم قديم ثم متقن)، ثم منسيّ */
export const SHOW_ORDER: ShowMem[] = ["fresh", "new_fix", "reviewing", "mastered", "old_review"];
/** مقاطع الشريط والحلقة على خريطة العضو نفسه: BAR_ORDER و«جديد» بعد «قريب» */
export const SHOW_BAR: ShowMem[] = ["mastered", "reviewing", "new_fix", "fresh", "old_review"];
/** ترتيب خيارات ورقة الاختيار: منسيّ، قريب، متقن، ثم «لم يُحفظ» آخرها.
    «قديم» (reviewing) و«جديد» ليسا منها بقرار صاحب المشروع: يضعهما الورد وحده (اختبار الخروج، وأقساط الأسبوع)،
    ولا يختارهما العضو. و«قديم» باقٍ في STATUSES وBAR_ORDER لأن ما وُضع به يُعرض كما هو. */
export const PICK_ORDER: HifzStatus[] = ["old_review", "new_fix", "mastered", "none"];
export const isStatus = (s: unknown): s is HifzStatus => typeof s === "string" && (STATUSES as string[]).includes(s);

export const round1 = (x: number) => Math.round(x * 10) / 10;
/** رقم بعلامة عشرية واحدة إن وُجد كسر: ١٢٣ · ٦٫١ */
export const fmt = (x: number) => num(round1(x));
const zero = (): ByStatus => ({ none: 0, old_review: 0, new_fix: 0, reviewing: 0, mastered: 0 });

/* ===== محور الصفحات ===== */
/** فهرس الآية المطلق (٠..٦٢٣٥) لأول آية في كل سورة */
const AYA0: number[] = [0];
{ let a = 0; for (const s of SURAHS) { AYA0[s.n] = a; a += s.ayas; } }
const AYA_END = AYA0[114] + SURAHS[113].ayas;
const PAGE0 = PAGES.map(([su, ay]) => AYA0[su] + ay - 1);
/** موضع بداية الآية ذات الفهرس المطلق x على محور الصفحات: الصفحة p تشغل [p, p+1) والآيات فيها بالتساوي */
function posOfAbs(x: number): number {
  if (x >= AYA_END) return TOTAL_PAGES + 1;
  let lo = 0, hi = PAGE0.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (PAGE0[mid] <= x) lo = mid; else hi = mid - 1; }
  const p0 = PAGE0[lo], p1 = lo + 1 < PAGE0.length ? PAGE0[lo + 1] : AYA_END;
  return lo + 1 + (x - p0) / Math.max(1, p1 - p0);
}
/** بداية كل سورة على المحور (فهرس بالرقم؛ POS[0] غير مستعمل، وPOS[115] نهاية المحور = ٦٠٥).
    كانت تُجمع من SURAHS.pages (كسور بثلاث منازل) وتُلصق بالصفحة الصحيحة، فتداخلت ثلاث سور في جزء عمّ بـ٠٫٠٠١
    وانتهى المحور عند ٦٠٤٫٩٩٩. الآن تُؤخذ من موضع أول آية في السورة على محور PAGES نفسه الذي تُحسب به الآيات،
    فالنهاية تساوي البداية التالية تمامًا، والفرق عن SURAHS.pages لا يتجاوز نصف جزء من ألف من الصفحة. */
const POS: number[] = [0];
for (const s of SURAHS) POS[s.n] = posOfAbs(AYA0[s.n]);
POS[115] = TOTAL_PAGES + 1;
export const surahOf = (n: number) => SURAHS[n - 1];
/** صفحات السورة n على المحور (عرضها بين بدايتها وبداية التالية) */
export const surahPages = (n: number) => (n >= 1 && n <= 114 ? POS[n + 1] - POS[n] : 0);
/** موضع السورة n على محور الصفحات: [بدايتها، نهايتها] — ونهايتها هي بداية التالية بعينها */
export const surahSpan = (n: number): [number, number] => [POS[n], POS[n + 1]];

/** الجزء الذي تقع فيه الآية (سورة، آية) */
export function juzOf(sura: number, aya: number): number {
  for (let i = JUZ.length - 1; i >= 0; i--) { const J = JUZ[i]; if (sura > J.sura || (sura === J.sura && aya >= J.aya)) return J.j; }
  return 1;
}
/** أول جزء وآخر جزء تمتد فيهما السورة */
export function surahJuz(n: number): [number, number] { const s = SURAHS[n - 1]; return [juzOf(n, 1), juzOf(n, s.ayas)]; }

export type JuzInfo = { j: number; start: number; end: number; pages: number; surahs: number[]; full: number[] };
/** بداية الجزء على المحور: موضع أول آيةٍ منه. كان يُلصق برأس صفحته فاختلفت أجزاء ٤ و٧ و١١ (تبدأ وسط الصفحة:
    آل عمران ٩٣، المائدة ٨٢، التوبة ٩٣) عن juzAyahs بآياتٍ تُصبغ في الجزء الخطأ. والجزء ٣١ الوهمي = نهاية المحور */
function juzStart(i: number): number {
  if (i >= JUZ.length) return TOTAL_PAGES + 1;
  const J = JUZ[i];
  return posOfAbs(AYA0[J.sura] + J.aya - 1);
}
/** الأجزاء الثلاثون: مدى صفحاتها، والسور التي تمسّها، والسور الواقعة فيها كاملة */
export const JUZ_INFO: JuzInfo[] = JUZ.map((J, i) => {
  const start = juzStart(i), end = juzStart(i + 1);
  const surahs: number[] = [], full: number[] = [];
  for (const s of SURAHS) { const [a, b] = surahJuz(s.n); if (a <= J.j && J.j <= b) { surahs.push(s.n); if (a === J.j && b === J.j) full.push(s.n); } }
  return { j: J.j, start, end, pages: end - start, surahs, full };
});
/** سور جزء عمّ (كلها كاملة فيه) */
export const AMMA: number[] = JUZ_INFO[29].full;
/** صفحات السورة n الواقعة داخل الجزء j */
export function overlap(n: number, j: number): number {
  const J = JUZ_INFO[j - 1]; const a = POS[n], b = a + surahPages(n);
  return Math.max(0, Math.min(b, J.end) - Math.max(a, J.start));
}

/* ===== الأجزاء المحفوظة من السورة (bands) ===== */
const EPS = 1e-4;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
type Mem = Exclude<HifzStatus, "none">;
/** ترتيب ودمج: يُسقط الفتات، ويدمج المتلاصق بالحالة نفسها، ويقصّ المتداخل لصالح السابق */
export function normBands(list: Band[]): Band[] {
  const xs = list.map(([f, t, st]) => [clamp01(Math.round(f * 1e6) / 1e6), clamp01(Math.round(t * 1e6) / 1e6), st] as Band)
    .filter(([f, t, st]) => t - f > EPS && (st as HifzStatus) !== "none").sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out: Band[] = [];
  for (const x of xs) {
    const last = out[out.length - 1];
    if (last && x[0] < last[1] - EPS) x[0] = last[1];
    if (x[1] - x[0] <= EPS) continue;
    if (last && last[2] === x[2] && Math.abs(last[1] - x[0]) <= EPS) last[1] = x[1];
    else out.push(x);
  }
  return out;
}
/** أجزاء السورة n المحفوظة: من تفصيلها إن وُجد، وإلا السورة كلها بحالتها. على خريطة العرض تُرجع أجزاء العرض (فيها «جديد») */
export function piecesOf(n: number, map: HifzMapT, bands?: BandsMapT): Band[];
export function piecesOf(n: number, map: ShowMapT, bands?: ShowBandsT): ShowBand[];
export function piecesOf(n: number, map: ShowMapT, bands?: ShowBandsT): ShowBand[] {
  const b = bands?.[n];
  if (b) return b;
  const st = map[n] ?? "none";
  return st === "none" ? [] : [[0, 1, st]];
}
/** طلاء المدى [a, b] بالحالة (none يمسحه) مع إبقاء ما خارجه */
export function paint(pieces: Band[], a: number, b: number, st: HifzStatus): Band[] {
  const out: Band[] = [];
  for (const [f, t, s] of pieces) {
    if (t <= a + EPS || f >= b - EPS) { out.push([f, t, s]); continue; }
    if (f < a - EPS) out.push([f, a, s]);
    if (t > b + EPS) out.push([b, t, s]);
  }
  if (st !== "none") out.push([a, b, st as Mem]);
  return normBands(out);
}
/** مدخل المخزن للسورة: كلها بحالة واحدة (bands فارغ) أو مقسّمة بحالتها الغالبة */
export type Entry = { surah: number; status: HifzStatus; bands?: Band[] | null };
/** من أجزاء إلى مدخل: لا شيء = لم يُحفظ، وجزء واحد يغطي السورة = حالة كاملة، وغير ذلك مقسّمة */
export function entryOf(surah: number, pieces: Band[]): Entry {
  const p = normBands(pieces);
  if (!p.length) return { surah, status: "none", bands: null };
  if (p.length === 1 && p[0][0] <= EPS && p[0][1] >= 1 - EPS) return { surah, status: p[0][2], bands: null };
  return { surah, status: dominant(p), bands: p };
}
/** الحالة الأكثر صفحاتٍ بين الأجزاء. SHOW_BAR هو BAR_ORDER و«جديد» فيه، فالأجزاء المخزّنة تُحسم كما كانت */
export function dominant(pieces: Band[]): HifzStatus;
export function dominant(pieces: ShowBand[]): ShowStatus;
export function dominant(pieces: ShowBand[]): ShowStatus {
  const by = new Map<ShowStatus, number>();
  for (const [f, t, s] of pieces) by.set(s, (by.get(s) ?? 0) + (t - f));
  let best: ShowStatus = "none", bv = 0;
  for (const s of SHOW_BAR) { const v = by.get(s) ?? 0; if (v > bv + EPS) { best = s; bv = v; } }
  return best;
}
/** نسبة المحفوظ من السورة (٠..١) */
export const coveredOf = (pieces: ShowBand[]) => pieces.reduce((a, [f, t]) => a + (t - f), 0);
/** أبعد حدّ محفوظ من أول السورة (لمؤشر «كم حفظت منها») */
export const extentOf = (pieces: ShowBand[]) => (pieces.length ? Math.max(...pieces.map((p) => p[1])) : 0);
/** السورة محفوظة كلها بحالة واحدة؟ */
export const isWhole = (pieces: ShowBand[]) => pieces.length === 1 && pieces[0][0] <= EPS && pieces[0][1] >= 1 - EPS;

/* ===== «جديد»: حالة عرضٍ تُشتقّ من الورد ولا تُخزَّن ===== */
/** ترتيبٌ ودمجٌ لأجزاء العرض المتلاصقة بالحالة نفسها (أجزاء freshView لا تتداخل؛ الفتات دون EPS ضُمّ إلى جاره عند بنائها) */
function showNorm(list: ShowBand[]): ShowBand[] {
  const xs = list.filter(([f, t]) => t - f > 1e-9).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out: ShowBand[] = [];
  for (const [f, t, st] of xs) {
    const last = out[out.length - 1];
    if (last && last[2] === st && Math.abs(last[1] - f) <= EPS) last[1] = Math.max(last[1], t);
    else out.push([f, t, st]);
  }
  return out;
}
/** يقسم «قريب» (new_fix) إلى «جديد» حيث يقع في مدَيات الورد، و«قريب» فيما سواه، ويُبقي سائر الحالات كما هي.
    المدَيات على محور الأوجه نفسه (السورة n تشغل surahSpan(n))، من freshSpans في lib/wird.ts وحدها: فلا تختلف الخريطة والورد.
    الناتج للرسم وحده، ولا يُمسّ الأصل. المجموع لا يتغيّر: الفتات بين جزأين يُضمّ إلى «جديد» ولا يسقط */
export function freshView(map: HifzMapT, bands: BandsMapT | undefined, spans: readonly (readonly [number, number])[]): ShowView {
  const m: ShowMapT = { ...map }, b: ShowBandsT = { ...(bands ?? {}) };
  const xs = spans.filter(([a, c]) => c > a).map(([a, c]): [number, number] => [a, c]).sort((p, q) => p[0] - q[0]);
  if (!xs.length) return { map: m, bands: b };
  for (const s of SURAHS) {
    const ps = piecesOf(s.n, map, bands);
    if (!ps.some((p) => p[2] === "new_fix")) continue;
    const [s0, s1] = surahSpan(s.n), w = s1 - s0;
    const inside: [number, number][] = [];
    for (const [x0, x1] of xs) { const lo = Math.max(x0, s0), hi = Math.min(x1, s1); if (hi > lo) inside.push([(lo - s0) / w, (hi - s0) / w]); }
    if (!inside.length) continue;
    const out: ShowBand[] = [];
    for (const [f, t, st] of ps) {
      if (st !== "new_fix") { out.push([f, t, st]); continue; }
      let cur = f, any = false;
      for (const [u, v] of inside) {
        let lo = Math.max(u, cur); const hi = Math.min(v, t);
        if (hi - lo <= EPS) continue;
        if (lo - cur <= EPS) lo = cur; else out.push([cur, lo, "new_fix"]);
        out.push([lo, hi, "fresh"]); cur = hi; any = true;
      }
      if (t - cur > EPS) out.push([cur, t, "new_fix"]);
      else if (any) out[out.length - 1][1] = t;
      else out.push([f, t, st]);
    }
    const nb = showNorm(out);
    if (!nb.some((p) => p[2] === "fresh")) continue;
    if (isWhole(nb)) { m[s.n] = nb[0][2]; delete b[s.n]; }
    else { b[s.n] = nb; m[s.n] = dominant(nb); }
  }
  return { map: m, bands: b };
}

/* ===== الآيات على محور الصفحات ===== */
/** الآية التي يصل إليها الكسر f من السورة n (آخر آية تنتهي داخل المدى [٠، f]) وصفحتها؛ aya = ٠ إن لم يبلغ آية كاملة */
export function ayahAt(n: number, f: number): { aya: number; page: number } {
  const s = SURAHS[n - 1];
  if (f <= EPS) return { aya: 0, page: s.pageStart };
  const end = POS[n + 1];
  const target = Math.min(end, POS[n] + clamp01(f) * surahPages(n));
  let aya = 0;
  if (f >= 1 - EPS) aya = s.ayas;
  else {
    let lo = 0, hi = s.ayas;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; const e = mid < s.ayas ? posOfAbs(AYA0[n] + mid) : end; if (e <= target + 0.015) lo = mid; else hi = mid - 1; }
    aya = lo;
  }
  const page = Math.min(TOTAL_PAGES, Math.max(s.pageStart, Math.ceil(target - 1 - 1e-6)));
  return { aya, page };
}
/** عكس ayahAt: موضع نهاية الآية k من السورة n بكسر من صفحاتها (٠..١).
    k ≥ عدد آياتها = السورة كلها، و k ≤ ٠ = لا شيء. يُلصق بالآية تمامًا حتى يعود ayahAt بالرقم نفسه */
export function fracOfAyah(n: number, k: number): number {
  const s = SURAHS[n - 1]; if (!s) return 0;
  if (k <= 0) return 0;
  if (k >= s.ayas) return 1;
  return clamp01((posOfAbs(AYA0[n] + k) - POS[n]) / surahPages(n));
}
/** ما في الصفحة: سورتها وأول آية فيها وآخرها — فرقم الصفحة وحده لا يدلّ على شيء بلا مصحف.
    الصفحة التي تبدأ فيها سورة جديدة تُنسب إلى السورة التي تبدأ بها، والمدى ينتهي بآخر آية فيها أو بآخر الصفحة */
export function pageSpan(page: number): { surah: number; from: number; to: number } | null {
  if (!Number.isFinite(page) || page < 1 || page > TOTAL_PAGES) return null;
  const cur = PAGES[page - 1]; if (!cur) return null;
  const [su, ay] = cur;
  const nxt = page < TOTAL_PAGES ? PAGES[page] : null;
  const s = SURAHS[su - 1]; if (!s) return null;
  const to = nxt && nxt[0] === su ? nxt[1] - 1 : s.ayas;
  return { surah: su, from: ay, to: Math.max(ay, to) };
}
/** مقطع متصل من سورة: من آية إلى آية */
export type AyaSeg = { surah: number; from: number; to: number };
/** ما تحويه الصفحة من مقاطع السور. الصفحة قد تجمع آخر سورة وأول التي بعدها
    (٢٢١ آخر يونس وأول هود)، فنسبتها إلى سورة واحدة تُسمّيها باسم ليس اسمها. */
function segsOfPage(page: number): AyaSeg[] {
  if (!Number.isFinite(page) || page < 1 || page > TOTAL_PAGES) return [];
  const cur = PAGES[page - 1]; if (!cur) return [];
  const [su, ay] = cur;
  const nxt = page < TOTAL_PAGES ? PAGES[page] : null;
  if (!nxt) return [{ surah: su, from: ay, to: SURAHS[su - 1].ayas }];
  const [nsu, nay] = nxt;
  if (nsu === su) return [{ surah: su, from: ay, to: Math.max(ay, nay - 1) }];
  const out: AyaSeg[] = [{ surah: su, from: ay, to: SURAHS[su - 1].ayas }];
  for (let k = su + 1; k < nsu; k++) out.push({ surah: k, from: 1, to: SURAHS[k - 1].ayas });
  if (nay > 1) out.push({ surah: nsu, from: 1, to: nay - 1 });
  return out;
}
/** صفحاتٌ ← مقاطع آيات مدموجة: الصفحات المتتالية من سورة واحدة تصير سطرًا واحدًا
    «الملك ١–٣٠» لا ثلاثة أسطر بأرقام صفحات (طلب صاحب المشروع). */
export function ayaSegments(pages: number[]): AyaSeg[] {
  const segs: AyaSeg[] = [];
  for (const p of [...new Set(pages)].sort((a, b) => a - b)) segs.push(...segsOfPage(p));
  const out: AyaSeg[] = [];
  for (const g of segs) {
    const last = out[out.length - 1];
    // يُدمج ما كان من السورة نفسها وملاصقًا أو متداخلًا
    if (last && last.surah === g.surah && g.from <= last.to + 1) last.to = Math.max(last.to, g.to);
    else out.push({ ...g });
  }
  return out;
}
/** مدى الجزء j داخل السورة n بكسر من صفحاتها [a, b]، أو null إن لم يمسّها */
export function juzSpan(n: number, j: number): [number, number] | null {
  const J = JUZ_INFO[j - 1]; const a = POS[n], len = surahPages(n);
  const lo = Math.max(a, J.start), hi = Math.min(a + len, J.end);
  if (hi - lo <= 1e-6 || len <= 0) return null;
  return [clamp01((lo - a) / len), clamp01((hi - a) / len)];
}
/** آيات السورة n داخل الجزء j: [١٤٢، ٢٥٢] */
export function juzAyahs(n: number, j: number): [number, number] {
  const s = SURAHS[n - 1]; const J = JUZ[j - 1], N = JUZ[j];
  const from = J.sura === n ? J.aya : 1;
  const to = N && N.sura === n ? N.aya - 1 : s.ayas;
  return [from, to];
}

/* ===== المجاميع ===== */
/** الباقي من total بعد done: صفرٌ تامّ إن اكتمل (فجمع كسور المحور يحيد عن الصحيح بجزء من مليون المليون) */
const rest = (total: number, done: number) => (total - done <= 1e-6 ? 0 : total - done);
export type Totals = { by: ByStatus; counts: ByStatus; memorized: number; mastered: number; je: number; stage: number };
/** أوجه كل حالة وعدد السور التي فيها شيءٌ منها */
function tally(map: ShowMapT, bands: ShowBandsT | undefined, by: Record<string, number>, counts: Record<string, number>) {
  for (const s of SURAHS) {
    const ps = piecesOf(s.n, map, bands);
    if (!ps.length) { counts.none++; continue; }
    const seen = new Set<ShowStatus>();
    for (const [f, t, st] of ps) { by[st] += (t - f) * surahPages(s.n); seen.add(st); }
    seen.forEach((st) => counts[st]++);
  }
}
export function totals(map: HifzMapT, bands?: BandsMapT): Totals {
  const by = zero(), counts = zero();
  tally(map, bands, by, counts);
  const memorized = by.old_review + by.new_fix + by.reviewing + by.mastered;
  by.none = rest(TOTAL_PAGES, memorized);
  const je = juzEquiv(memorized);
  return { by, counts, memorized, mastered: by.mastered, je, stage: stageOf(je) };
}
/** مجاميع خريطة العرض: «جديد» مفصولًا من «قريب» للشريط والمفتاح والشرائح. أرقام المحفوظ المكتوبة تبقى من totals على المخزن */
export type ShowTotals = Omit<Totals, "by" | "counts"> & { by: ShowBy; counts: ShowBy };
export function showTotals(v: ShowView): ShowTotals {
  const by: ShowBy = { ...zero(), fresh: 0 }, counts: ShowBy = { ...zero(), fresh: 0 };
  tally(v.map, v.bands, by, counts);
  const memorized = by.old_review + by.new_fix + by.fresh + by.reviewing + by.mastered;
  by.none = rest(TOTAL_PAGES, memorized);
  const je = juzEquiv(memorized);
  return { by, counts, memorized, mastered: by.mastered, je, stage: stageOf(je) };
}
/** صفحات الجزء حسب الحالة (تقاطع دقيق على محور الصفحات، ومعه أجزاء السور الممتدة) */
export function juzFill(map: HifzMapT, j: number, bands?: BandsMapT): { by: ByStatus; filled: number; total: number };
export function juzFill(map: ShowMapT, j: number, bands?: ShowBandsT): { by: ShowBy; filled: number; total: number };
export function juzFill(map: ShowMapT, j: number, bands?: ShowBandsT): { by: ShowBy; filled: number; total: number } {
  const J = JUZ_INFO[j - 1]; const by: ShowBy = { ...zero(), fresh: 0 };
  for (const n of J.surahs) {
    const span = juzSpan(n, j); if (!span) continue;
    const len = surahPages(n);
    for (const [f, t, st] of piecesOf(n, map, bands)) { const o = Math.min(t, span[1]) - Math.max(f, span[0]); if (o > 0) by[st] += o * len; }
  }
  const filled = by.old_review + by.new_fix + by.fresh + by.reviewing + by.mastered;
  by.none = rest(J.pages, filled);
  return { by, filled, total: J.pages };
}
/** حلقة الأجزاء الثلاثين: لكل جزءٍ نصيبُ كل حالةٍ من صفحاته كسرًا ٠..١ — مادة الرسم في components/hifz/JuzRing.tsx.
    تُحسب هنا لا في المكوّن كي ترسم أسئلةُ الدخول معاينتها من خريطةٍ لم تُحفظ بعد (withEntries) بالحساب نفسه.
    وتقبل خريطة العرض فيُرسم «جديد» قوسًا وحده؛ والمخزّنة لا «جديد» فيها فتُرسم كما كانت */
export type RingSeg = Partial<Record<ShowMem, number>>;
export function juzRing(map: ShowMapT, bands?: ShowBandsT): RingSeg[] {
  return JUZ_INFO.map((J) => {
    const f = juzFill(map, J.j, bands); const out: RingSeg = {};
    for (const st of SHOW_BAR) { const x = f.total > 0 ? f.by[st] / f.total : 0; if (x > 1e-4) out[st] = Math.min(1, x); }
    return out;
  });
}
/** مداخل المخزن لصبغ أجزاءٍ كاملة بحالةٍ واحدة (أسئلة الدخول: «أحفظ خمسة أجزاء من آخر المصحف»).
    السورة الممتدة على أكثر من جزء (البقرة في ١–٣) تُجمَع أمداؤها في مدخلٍ واحد: paintMyRanges يحسب كل مدى من المخزن الأصلي،
    فمديان للسورة نفسها في نداءٍ واحد يمحو أحدُهما الآخر — ولذلك تتراكم هنا على acc */
export function juzEntries(juz: number[], status: HifzStatus, map: HifzMapT, bands?: BandsMapT): Entry[] {
  const acc = new Map<number, Band[]>();
  for (const j of juz) {
    const J = JUZ_INFO[j - 1]; if (!J) continue;
    for (const n of J.surahs) {
      const span = juzSpan(n, j); if (!span) continue;
      acc.set(n, paint(acc.get(n) ?? piecesOf(n, map, bands), span[0], span[1], status));
    }
  }
  return [...acc].map(([n, p]) => entryOf(n, p));
}
/** تطبيق مداخل على نسخةٍ من الخريطة بلا مسٍّ للأصل: للمخزن (hifzApi.putEntries) ولمعاينة أسئلة الدخول قبل الحفظ */
export function withEntries(map: HifzMapT, bands: BandsMapT | undefined, items: Entry[]): { map: HifzMapT; bands: BandsMapT } {
  const m: HifzMapT = { ...map }; const b: BandsMapT = { ...(bands ?? {}) };
  for (const e of items) {
    if (e.bands && e.bands.length) { b[e.surah] = e.bands; m[e.surah] = e.status === "none" ? e.bands[0][2] : e.status; }
    else { delete b[e.surah]; m[e.surah] = e.status; }
  }
  return { map: m, bands: b };
}
/** السورة n داخل الجزء j: نسبة المغطّى من نصيبها فيه والحالة الغالبة (لشريحة الجزء؛ على خريطة العرض قد تكون «جديد») */
export function juzPartOf(n: number, j: number, map: ShowMapT, bands?: ShowBandsT): { cover: number; status: ShowStatus } {
  const span = juzSpan(n, j); if (!span) return { cover: 0, status: "none" };
  const w = span[1] - span[0]; const inside: ShowBand[] = [];
  for (const [f, t, st] of piecesOf(n, map, bands)) { const a = Math.max(f, span[0]), b = Math.min(t, span[1]); if (b - a > EPS) inside.push([a, b, st]); }
  return { cover: w > 0 ? coveredOf(inside) / w : 0, status: dominant(inside) };
}
/** قائمة «القريب والمنسيّ»: ما هو قريب أو منسيّ (صفحات ذلك منها)، الأكبر صفحاتٍ أولًا. على خريطة العرض لا يُعدّ «جديد» فيها */
export function needsReview(map: ShowMapT, bands?: ShowBandsT): { n: number; status: HifzStatus; pages: number }[] {
  const out: { n: number; status: HifzStatus; pages: number }[] = [];
  for (const s of SURAHS) {
    let old = 0, nw = 0;
    for (const [f, t, st] of piecesOf(s.n, map, bands)) { if (st === "old_review") old += (t - f) * surahPages(s.n); else if (st === "new_fix") nw += (t - f) * surahPages(s.n); }
    if (old + nw > 0) out.push({ n: s.n, status: nw > old ? "new_fix" : "old_review", pages: old + nw });
  }
  return out.sort((a, b) => b.pages - a.pages || a.n - b.n);
}

/* ===== المرحلة (نفس قاعدة الخادم): مكافئ الأجزاء = الصفحات × ٣٠ ÷ ٦٠٤ بعلامة عشرية واحدة ===== */
export const juzEquiv = (pages: number) => round1((pages * 30) / TOTAL_PAGES);
/** نسبة صفحاتٍ من المصحف كله بأرقام اللغة: علامة عشرية واحدة تحت ١٠٪، وما فوق الصفر لا يُعرض صفرًا (أدناه ٠٫١٪) */
export const pctOf = (pages: number) => {
  const p = (pages / TOTAL_PAGES) * 100;
  const r = p > 0 && p < 10 ? Math.round(p * 10) / 10 : Math.round(p);
  const v = p > 0 && r === 0 ? 0.1 : r;
  return getLang() === "ar" ? `${num(v)}٪` : `${v}%`;
};
/** أدنى مكافئ أجزاء لكل مرحلة: ٠ (<١)، ١ (١–٤٫٩)، ٢ (٥–٩٫٩)، ٣ (١٠–١٩٫٩)، ٤ (٢٠–٢٩٫٤)، ٥ (≥ ٢٩٫٥ حافظ للقرآن كله) */
export const STAGE_MIN = [0, 1, 5, 10, 20, 29.5] as const;
export function stageOf(je: number): number { for (let s = 5; s >= 1; s--) if (je >= STAGE_MIN[s]) return s; return 0; }
/** المسافة إلى المرحلة التالية بالأجزاء (null للمرحلة الأخيرة) */
export function nextStageGap(je: number): number | null { const s = stageOf(je); return s >= 5 ? null : round1(STAGE_MIN[s + 1] - je); }
const STAGE_KEYS: Key[] = ["hzStage0", "hzStage1", "hzStage2", "hzStage3", "hzStage4", "hzStage5"];
export const stageTitle = (stage: number, women = false) => tg(STAGE_KEYS[Math.max(0, Math.min(5, stage))], women);
/** شارة الحلقة حول الصورة: «٦ج»؛ الحافظ كله «٣٠ج»؛ لا شارة قبل الجزء الأول */
export function badgeLabel(je: number, stage = stageOf(je)): string {
  if (stage <= 0) return "";
  return `${num(stage >= 5 ? 30 : Math.floor(je))}${t("hzJuzShort")}`;
}

/* ===== الأسماء =====
   أسماء الحالات كلمةٌ واحدة بقرار صاحب المشروع: لم يُحفظ · جديد · قريب · قديم · متقن · منسيّ. فالاسم المختصر هو الاسم نفسه */
const LABEL: Record<ShowStatus, Key> = { none: "hzStNone", fresh: "hzStFresh", new_fix: "hzStNew", reviewing: "hzStRev", mastered: "hzStMas", old_review: "hzStOld" };
const DESC: Record<ShowStatus, Key> = { none: "hzDsNone", fresh: "hzDsFresh", new_fix: "hzDsNew", reviewing: "hzDsRev", mastered: "hzDsMas", old_review: "hzDsOld" };
export const statusLabel = (s: ShowStatus) => t(LABEL[s]);
export const statusShort = statusLabel;
export const statusDesc = (s: ShowStatus) => t(DESC[s]);
/** اسم السورة بلغة الواجهة */
export const surahName = (n: number) => { const s = SURAHS[n - 1]; return getLang() === "ar" ? s.name : s.tname; };

/** معدود الأوجه بجوار رقم، والحكم فوق المئة لآخر رقمين: وجه · وجهان · أوجه (٣ إلى ١٠) · وجهًا (١١ إلى ٩٩).
    والكسر والصفر والمئة وما آخره ٠٠ أو ٠١ أو ٠٢ «وجه»: ١٠٢ وجه، ١٠٣ أوجه، ١١١ وجهًا، ٦٠٤ أوجه */
export function pagesNoun(x: number): string {
  const r = round1(x);
  if (getLang() !== "ar") return r === 1 ? t("hzPg1") : t("hzPgMany");
  if (!Number.isInteger(r)) return t("hzPg1");
  const m = r > 100 ? r % 100 : r;
  if (r === 2) return t("hzPg2");
  if (m >= 3 && m <= 10) return t("hzPgFew");
  return m >= 11 && m <= 99 ? t("hzPgMany") : t("hzPg1");
}
/** الكمية بمعدودها: «٣ أوجه» · «١١ وجهًا» · «٠٫٥ وجه». والاثنان بالمثنى وحده «وجهان» لا «٢ وجهان»،
    لأن المثنى يدل على عدده بنفسه (كرقاقات أسئلة البداية) */
export function pagesAmount(x: number): string {
  if (getLang() === "ar" && round1(x) === 2) return t("hzPg2");
  return `${fmt(x)} ${pagesNoun(x)}`;
}
/** معدود الأجزاء: جزء · جزآن · أجزاء · جزءًا (والكسر «جزء») */
export function juzNoun(x: number): string {
  const r = round1(x);
  if (getLang() !== "ar") return t("hzJuz1");
  if (!Number.isInteger(r) || r === 1 || r === 0) return t("hzJuz1");
  if (r === 2) return t("hzJuz2");
  return r >= 3 && r <= 10 ? t("hzJuzFew") : t("hzJuzMany");
}
