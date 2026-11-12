// نسخة مولَّدة بـ sync-lib.mjs من app/lib — لا تُعدَّل هنا؛ عدِّل المصدر في التطبيق ثم أعد التشغيل.
/* محرّك الورد: خريطة الحفظ ← ورد اليوم بالطريقة الأسبوعية. دوالّ صافية بلا شبكة ولا واجهة، تعمل في التطبيق وفي البوت سواءً.

   المبدأ الذي لا يُمسّ: خريطة الحفظ مصدر المراحل، والورد دالّةٌ منها. كل مرحلةٍ حالةٌ موجودة في الخريطة بلا حالةٍ جديدة:
     الحفظ الجديد = الفراغات · القديم الحديث = new_fix · المراجعة = reviewing + mastered · الاسترجاع = old_review.
   والفاتحة خارجها كلّها (قراره): تُقرأ في كل ركعة.

   الأسبوع يعيش في state.wk (مفتاحٌ واحد يُسقطه القارئ القديم كلّه): أقساطه الخمسة، وكتل القديم الحديث بترتيبها، وما سُمّع
   من المراجعة دورةً سليمة. موضع اليوم من الأسبوع = الأيام المحفوظة فيه، لا التقويم: اليوم الفائت يعيد الورد نفسه غدًا،
   واليوم الضيّق يُحفظ ولا يُحسب. ولا ينتهي أسبوعٌ فيه جديد بلا نتيجة اختباره.

   «متقن» لا يُكتب بضغطة ولا بمرور الوقت، بل بثلاثة اختبارات: الأسبوعي (يُدخل الجديد القديمَ الحديث)، والخروج (يُدخله المراجعة)،
   ودورتان سليمتان في المراجعة. فالكاتب الوحيد لـ mastered في الورد هو partPaint على نتيجة المراجعة السليمة الثانية.

   المؤشّر إحداثيٌّ على محور الأوجه يقول «من هنا تبدأ قراءتك التالية»، لا يتحرّك إلا بالتسجيل ويعود بالتراجع.
   والاتجاه يرتّب السور لا الآيات: القراءة داخل السورة إلى الأمام دائمًا.

   محرّك المؤشّرات القديم (wirdOf وrateOf وapplyLog وما معها، وبقيّة خطوات v97) باقٍ لاختباراته، ويقرأ الترحيبُ منه rateOf وحده؛
   ولا يدعوه البوت ولا الشاشة. والمحرّك لا يستورد hifzApi: يُرجع مدَيات الصبغ ويترك للواجهة الكتابة. */
import { dohaDate } from "./day.ts";
import { ayahAt, entryOf, fracOfAyah, MEM_ORDER, paint, piecesOf, surahSpan, withEntries, type Band, type BandsMapT, type Entry, type HifzMapT, type HifzStatus } from "./hifz.ts";
import { SURAHS, TOTAL_PAGES } from "./quran-data.ts";

/* ===== الأنواع ===== */
export type Track = "new" | "fix" | "review" | "restore";
export const TRACKS: Track[] = ["new", "fix", "review", "restore"];
/** ترتيب الطريقة في العرض (الشاشة والإعدادات والبطاقة والبوت): المراجعة، القديم الحديث، الحفظ الجديد، الاسترجاع. TRACKS باقٍ كما هو */
export const SHOW: Track[] = ["review", "fix", "new", "restore"];
/** مدى على محور الأوجه المتصل [من، إلى) */
export type Span = [number, number];
/** قطعة من مسار: داخل سورة واحدة دائمًا */
export type Piece = { n: number; a: number; b: number };
/** مقطع للعرض: آيات متصلة من سورة واحدة، ومعها وجهاها في المصحف وكسراها من السورة (للصبغ الدقيق) */
export type Seg = { surah: number; from: number; to: number; pages: number; p0: number; p1: number; f0: number; f1: number };
/** اتجاه السير على المصحف: ‎+١‎ من البقرة إلى الناس، ‎−١‎ من الناس إلى البقرة */
export type Side = 1 | -1;
/** أيام الحفظ في الأسبوع: من الطريقة نفسها، لا من الإعدادات */
export const NEW_DAYS = 5;
export type Prefs = {
  /** مرآةٌ للقارئ القديم (التطبيق v96 والبوت الحيّ): أوجه الجديد في يوم الحفظ = weekly ÷ ٥ مقرّبًا. تُكتب مع كل حفظ،
      ولا يقرؤها المحرّك الجديد مقدارًا للطريقة؛ وإن خالفت weekly فالمفتاح القديم يغلب (جهازٌ قديم حرّكه بعد كتابةٍ جديدة) */
  daily: number;
  /** الاسترجاع: أوجه كل يوم */
  restore: number;
  /** المراجعة: طول الدورة بالأيام */
  cycle: number;
  /** السورة التي يبدأ منها كل مسار؛ ٠ = تلقائي (أوّل المسار باتجاهه، وللجديد أوّل ثغرة). from.fix باقٍ في البيانات ولا يُقرأ */
  from: Record<Track, number>;
  /** القديم الحديث يتبع dir.new */
  dir: Record<Track, Side>;
  /** الحفظ الجديد: أوجه الأسبوع (٠ = لا جديد) */
  weekly: number;
  /** القديم الحديث: حجمه بالأوجه */
  recent: number;
};
/* الافتراضي ٥ في الأسبوع = الافتراضي القديم (وجه كل يوم × ٥): فجهازٌ لم يحفظ إعداداته قطّ يبقى على معناه القديم
   ولا يدفع مقدارًا لم يختره فوق صفّه (B8). العضو الجديد يختار مقداره في أسئلة البداية */
export const DEFAULTS: Prefs = {
  daily: 1, restore: 1, cycle: 7,
  from: { new: 0, fix: 0, review: 0, restore: 0 },
  dir: { new: 1, fix: 1, review: 1, restore: 1 },
  weekly: 5, recent: 10,
};
/** الطريق الوحيد لتغيير مقدار الأسبوع (الإعدادات وأسئلة البداية والمعاينات والتقدير): المرآة تتحرّك معه */
export const withWeekly = (p: Prefs, weekly: number): Prefs => ({ ...p, weekly, daily: Math.round((weekly / NEW_DAYS) * 100) / 100 });
/** محرّك المؤشّرات القديم، باقٍ لاختباراته: دورة التثبيت القديمة ثلاثة أيام */
export const FIX_CYCLE = 3;
/** مؤشّر كل مسار: موضع بداية القراءة التالية على محور الأوجه؛ null = لم يبدأ (تلقائي) */
export type Cursors = Record<Track, number | null>;
/** ما صُبغ في الخريطة آليًا عند التسجيل: السورة وأجزاؤها قبل الصبغ — للتراجع */
export type Painted = { surah: number; before: Band[] };
/** مدخل يومٍ في السجل (الشكل القديم نفسه، فيقرؤه القارئ القديم): أوجهه، والمؤشّرات قبل التقدّم (للتراجع)، وما قُرئ.
    steps = اشتُقّ من خطوات المحرّك الجديد؛ وبلا العلم سجّله جهازٌ قديم فيُعرض للقراءة وحدها */
export type LogEntry = { total: number; prev: Cursors; painted?: Painted[]; taken?: Record<Track, Span[]>; steps?: boolean };
/** خطوة: ضغطةٌ على قسمٍ واحد. prev/next المؤشّر قبلها وبعدها، spans ما قُرئ، ranges ما صُبغ وpainted صورة سوره قبل الصبغ.
    خطوة النتيجة تحمل t ونتيجتها ok: r دورة مراجعة، x اختبار خروج (b رقم الكتلة)، w اختبار الأسبوع.
    rcAdd/rcDel ما أضافته خطوة المراجعة إلى wk.rc وما أزالته منه بالضبط (عكسها)، وt0 نتيجة الأسبوع التي استبدلتها */
export type Step = {
  day: string; k: Track; prev: number | null; next: number | null; spans: Span[]; pages: number; ranges?: PaintRange[]; painted?: Painted[];
  t?: "r" | "x" | "w"; ok?: boolean; b?: number; rcAdd?: Span[]; rcDel?: Span[]; t0?: { d: string; ok: boolean };
};
/** خطّة اليوم تُثبَّت عند أول فعلٍ فيه: الأقسام المطلوبة، والمؤشّرات حينها (cur)، وما يُقرأ (taken) وأوجهه (today) وأين ينتهي (next).
    tight = اختار «يومي ضيّق»؛ x = اختبار الخروج المعروض اليوم */
export type Plan = {
  day: string; need: Track[];
  cur?: Cursors; next?: Cursors; taken?: Record<Track, Span[]>; today?: Record<Track, number>;
  tight?: true; x?: { b: number; s: Span[] };
};
/** كتلة من القديم الحديث: مدَياتٌ مدموجة على المحور. hold = بداية الأسبوع الذي لم ينجح فيه اختبار خروجها (تُقرأ مع النافذة حتى ينتهي) */
export type Block = { id: number; s: Span[]; hold?: string };
/** أسبوع الحفظ: مفتاحٌ واحد اختياري في الحالة، فيُسقطه القارئ القديم كلّه. a = اليوم الذي قبل أول أيامه (حصريّ)،
    p أقساطه (٠ إلى ٥، كلٌّ مدَياتٌ مدموجة)، r أسبوعٌ معاد، t نتيجة اختباره ويومها، z أيامه الضيّقة، q القديم الحديث الأقدم أولًا،
    k رقم الكتلة التالية، rc ما في المراجعة وقد سُمّع دورةً سليمة واحدة، c ما حفظه جهازٌ قديم خارج أقساط أسبوعٍ مضى ولم يغطّه اختباره
    (محمولٌ إلى هذا الأسبوع: يُقرأ مع جديده ويُسمَّع في اختباره، ولا يدخل القديم الحديث قبل «نجحت») */
export type Week = {
  v: 1; n: number; a: string; p: Span[][]; r?: true; t?: { d: string; ok: boolean }; z?: string[];
  q: Block[]; k: number; rc?: Span[]; c?: Span[];
};
/** الحالة المحفوظة (localStorage ww-wird-state وعمود state على الخادم). wkAt[يوم] = wk كما كان قبل أول فعلٍ في ذلك اليوم (null = لا أسبوع) */
export type State = { cur: Cursors; log: Record<string, LogEntry>; steps?: Step[]; plan?: Plan; wk?: Week; wkAt?: Record<string, Week | null> };
/** مدى صبغ لـ hifzApi.paintMyRanges: [سورة، من، إلى] بكسر من أوجهها */
export type PaintRange = [number, number, number];

/* الفاتحة خارج الورد كلّه. وهي باقية في خريطة الحفظ كما هي. */
const SKIP = new Set([1]);
const EPS = 1e-6;
/** السور التي يدور عليها الورد: ٢..١١٤ */
const FIRST = 2, LAST = 114, N = LAST - FIRST + 1;
const AXIS_END = TOTAL_PAGES + 1;
const len = (xs: { a: number; b: number }[]) => xs.reduce((s, q) => s + (q.b - q.a), 0);
const toSpan = (q: Piece): Span => [q.a, q.b];

/* ===== التحليل: من الخريطة إلى قطع المسارات (يُحسب مرة ويُمرَّر لكل ما بعده) ===== */
export type Analysis = {
  /** قطع كل مسار على المحور، تصاعديًا، مقطَّعة على حدود السور؛ new = الفراغات بلا الفاتحة */
  pieces: Record<Track, Piece[]>;
  /** مجموع أطوال القطع */
  pool: Record<Track, number>;
  /** ما بقي بلا حفظ (= pool.new) */
  left: number;
  /** المحفوظ كلّه مدموجًا (لتحديد مبتدأ الجديد تلقائيًا) */
  mem: Span[];
};
const trackOf = (st: Band[2]): Track => (st === "new_fix" ? "fix" : st === "old_review" ? "restore" : "review");
/** يضيف قطعة ويدمجها بالسابقة إن كانت من السورة نفسها وملاصقةً لها — ولا يدمج عبر حدود السور */
function push(list: Piece[], q: Piece) {
  if (q.b - q.a <= EPS) return;
  const last = list[list.length - 1];
  if (last && last.n === q.n && Math.abs(last.b - q.a) <= EPS) last.b = q.b;
  else list.push(q);
}
export function analyze(map: HifzMapT, bands?: BandsMapT): Analysis {
  const pieces: Record<Track, Piece[]> = { new: [], fix: [], review: [], restore: [] };
  const memRaw: Span[] = [];
  for (const s of SURAHS) {
    if (SKIP.has(s.n)) continue;
    const [a, b] = surahSpan(s.n), w = b - a;
    // كسر السورة إلى إحداثيّ على المحور؛ طرفاها بعينهما حتى تتلاصق القطع مع السور المجاورة تمامًا
    const at = (f: number) => (f <= 1e-9 ? a : f >= 1 - 1e-9 ? b : a + f * w);
    const list = [...piecesOf(s.n, map, bands)].sort((x, y) => x[0] - y[0]);
    let cur = 0;
    for (const [f, t, st] of list) {
      const f1 = Math.max(f, cur);                // المتداخل يُقَصّ لصالح السابق (كما normBands)
      if (t - f1 <= 1e-9) continue;
      push(pieces.new, { n: s.n, a: at(cur), b: at(f1) });
      const q = { n: s.n, a: at(f1), b: at(t) };
      push(pieces[trackOf(st)], q); memRaw.push([q.a, q.b]);
      cur = t;
    }
    push(pieces.new, { n: s.n, a: at(cur), b });
  }
  const pool = { new: len(pieces.new), fix: len(pieces.fix), review: len(pieces.review), restore: len(pieces.restore) };
  return { pieces, pool, left: pool.new, mem: mergeSpans(memRaw) };
}
const mergeSpans = (xs: Span[]): Span[] => {
  const out: Span[] = [];
  for (const [a, b] of [...xs].sort((p, q) => p[0] - q[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + EPS) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
};
/** السورة التي يقع فيها الإحداثيّ: [بدايتها، نهايتها) — فالواقع على الحدّ تمامًا للسورة التالية (لا السابقة) */
export function surahAt(x: number): number {
  if (x >= AXIS_END) return LAST;
  for (let n = FIRST; n <= LAST; n++) if (x < surahSpan(n)[1]) return n;
  return LAST;
}

/* ===== الترتيب: دوران السور باتجاهه من المبتدأ، والقراءة داخل السورة إلى الأمام =====
   رتبة السورة = بُعدها عن المبتدأ في الاتجاه (٠ للمبتدأ نفسه)، فتُرتَّب القطع بالرتبة ثم بموضعها تصاعديًا داخل
   السورة. فمن قال «ابدأ من هود، من الناس إلى البقرة» قُرئ له هودٌ من حيث وقف ثم يونس ثم التوبة… ثم بعد البقرة
   يلتفّ إلى الناس نزولًا حتى يوسف. (v92 كانت تقلب القائمة كلّها فقرأت آخر قطع السورة قبل أولها.) */
export type Order = { pieces: Piece[]; anchor: number; dir: Side; fromMissing: boolean };
const rankOf = (n: number, anchor: number, dir: Side) => (dir === 1 ? (n - anchor + N) % N : (anchor - n + N) % N);
const clampSurah = (n: number) => Math.min(LAST, Math.max(FIRST, Math.round(n)));
/* مبتدأ الجديد حين يترك الاختيار تلقائيًا: أوّل ثغرةٍ داخل حفظه باتجاهه، وإلا طرفُه، وإلا أوّل الفراغ */
function autoAnchor(none: Piece[], mem: Span[], dir: Side): number {
  const fwd = dir === 1;
  if (!none.length) return fwd ? FIRST : LAST;
  const seq = fwd ? none : [...none].reverse();
  if (!mem.length) return seq[0].n;
  const first = mem[0][0], last = mem[mem.length - 1][1];
  const inside = seq.find((q) => q.a > first + EPS && q.b < last - EPS);
  const edge = fwd ? seq.find((q) => q.a >= last - EPS) : seq.find((q) => q.b <= first + EPS);
  return (inside ?? edge ?? seq[0]).n;
}
/** ترتيب قراءة المسار k. التثبيت يتبع اتجاه الحفظ الجديد (هو أثره الذي خلّفه وراءه) */
export function orderOf(an: Analysis, k: Track, prefs: Prefs): Order {
  const p = normPrefs(prefs);
  const dir: Side = k === "fix" ? p.dir.new : p.dir[k];
  const list = an.pieces[k];
  const from = p.from[k] > 0 ? clampSurah(p.from[k]) : 0;
  const fromMissing = from > 0 && !list.some((q) => q.n === from);
  const anchor = from || (k === "new" ? autoAnchor(list, an.mem, dir) : dir === 1 ? FIRST : LAST);
  const pieces = [...list].sort((x, y) => rankOf(x.n, anchor, dir) - rankOf(y.n, anchor, dir) || x.a - y.a);
  return { pieces, anchor, dir, fromMissing };
}

/* ===== الكمية اليومية لكل مسار ===== */
export function rateOf(an: Analysis, prefs: Prefs): Record<Track, number> {
  const p = normPrefs(prefs);
  const cycle = Math.max(1, Math.round(p.cycle));
  const daily = p.daily, restore = p.restore;
  /* التثبيت: قريب العهد يحتاج ملامسةً قريبة لكنه لا يبتلع الورد. فهو ثلاثة أمثال معدّل الحفظ اليومي
     (من يحفظ صفحة يثبّت ثلاثًا)، وبحدٍّ أدنى يختم المسار في FIX_CYCLE أيام — أيّهما أقلّ. */
  const fix = an.pool.fix > EPS
    ? Math.min(an.pool.fix, Math.max(Math.min(an.pool.fix, 1), Math.min(an.pool.fix / FIX_CYCLE, Math.max(1, daily * 3))))
    : 0;
  return { new: daily, fix, review: an.pool.review > EPS ? an.pool.review / cycle : 0, restore };
}

/* ===== المؤشّر: من إحداثيٍّ على المحور إلى موضعٍ في الترتيب ===== */
type Pos = { i: number; x: number };
/** أول قطعة في الترتيب عند المؤشّر أو بعده: رتبتها أعلى من رتبة سورته، أو من سورته نفسها ولم تنتهِ قبله.
    القطعة الأعلى رتبةً تُقرأ من أوّلها دائمًا: فقد تكون أدنى من المؤشّر على المحور حين يلتفّ الدوران (مؤشّرٌ في
    سورة ١٠٠ وأقرب قطعةٍ بعده البقرة)، وقصّها إلى max(a, cur) كان يضع البداية خلف نهايتها فتُتخطّى القطعة كلّها
    (الإنسان تسقط من الاسترجاع النازل دورةً كاملة، وهود من التثبيت). القصّ إلى المؤشّر لقطع سورته وحدها.
    null = لا قطعة بعده (wirdOf يلتفّ بالكلّ إلى أوّل الترتيب). والمؤشّر null = أوّل الترتيب */
export function locate(o: Order, cur: number | null): Pos | null {
  if (!o.pieces.length) return null;
  if (cur == null) return { i: 0, x: o.pieces[0].a };
  const r = rankOf(surahAt(cur), o.anchor, o.dir);
  for (let i = 0; i < o.pieces.length; i++) {
    const q = o.pieces[i], rq = rankOf(q.n, o.anchor, o.dir);
    if (rq > r) return { i, x: q.a };
    if (rq === r && q.b > cur + EPS) return { i, x: Math.max(q.a, cur) };
  }
  return null;
}
/** صفحات الترتيب قبل الموضع (لـ«قطعتَ ٨ من ٢٦») */
const offsetOf = (o: Order, pos: Pos) => len(o.pieces.slice(0, pos.i)) + (pos.x - o.pieces[pos.i].a);
/** يأخذ want صفحة من الموضع بالتتابع (قد يعبر سورًا)، فيُرجع القطع المقروءة بترتيب القراءة — لا تُدمج ولا تُرتَّب
    ثانيةً (v92 كانت تفرزها بالموضع فانقلب الترتيب) — ومعها موضع البداية التالية: بداية القطعة التالية إن بلغ آخر
    قطعة؛ وإن بلغ آخر الترتيب فبدايته — للدائري ولغير الدائري سواءً. الفرق بينهما في النصيب لا في المؤشّر: الدائري
    يواصل الأخذ من أوّل الترتيب في اليوم نفسه، وغير الدائري (الجديد) يقف.
    لماذا لا يُترك مؤشّر الجديد عند نهاية آخر قطعة؟ لأن نهايتها حدُّ سورةٍ تمامًا، وsurahAt تنسب الحدّ إلى السورة التالية
    صعودًا — وهي في الترتيب النازل أعلى رتبةً من التي فُرغ منها لا أدنى، فتجدها locate «عند المؤشّر» وتُعاد قراءتها
    (ثغرات ٢١ و٢٢ و٥٠ نزولًا من ١١: بعد ٢١ عاد إلى ٢٢ ثم ٢١ ثم ٢٢… ولم تُقرأ ٥٠ ثانيةً أبدًا). وبداية القطعة داخل
    سورتها بالاصطلاح نفسه، فلا لبس. وهذا هو معنى F3 نفسه مكتوبًا في المؤشّر: لا قطعة بعده ⇒ أوّل الترتيب */
function takeFrom(o: Order, pos: Pos, want: number, wrap: boolean): { spans: Piece[]; end: Pos } {
  const n = o.pieces.length;
  let { i, x } = pos, left = Math.min(want, len(o.pieces));
  const out: Piece[] = [];
  let guard = 0;
  while (left > EPS && guard++ < 10000) {
    const q = o.pieces[i];
    const room = Math.min(q.b - x, left);
    if (room > EPS) { push(out, { n: q.n, a: x, b: x + room }); left -= room; x += room; }
    if (x >= q.b - EPS) {
      i++;
      if (i >= n) { i = 0; if (!wrap) return { spans: out, end: { i, x: o.pieces[0].a } }; }
      x = o.pieces[i].a;
    }
  }
  return { spans: out, end: { i, x } };
}

/* ===== من المدَيات إلى مقاطع آيات ===== */
/** كسر السورة إلى إحداثيّ ٠..١ (مقصوصًا) — القاعدة الواحدة التي تُترجَم بها المدَيات إلى آيات في toSegs وcontOf */
const fracIn = (n: number, x: number) => { const [s0, s1] = surahSpan(n); return Math.max(0, Math.min(1, (x - s0) / (s1 - s0))); };
/** الآية التي يقع فيها الكسر f من السورة n (١..عدد آياتها) بلا سماحة: أصغر آيةٍ تنتهي بعده.
    ayahAt تعدّ الآية تامّةً إن بقي منها أقلّ من ٠٫٠١٥ صفحة، وهذا صوابٌ لحدود الأيام لكنه يُسمّي فتاتًا في آخر
    الآية ٥٠ «الآية ٥١» — فالفتات يُسمّى بآيته التي يقع فيها حقًّا */
function ayahContaining(n: number, f: number): number {
  let lo = 1, hi = SURAHS[n - 1].ayas;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (fracOfAyah(n, mid) > f) hi = mid; else lo = mid + 1; }
  return lo;
}
/** قطعة من مدًى داخل سورة واحدة: حدّاها على المحور وكسراهما من السورة — الوحدة التي تُترجَم إلى صفٍّ (toSegs) أو مدى صبغ (newPaint) */
type Cut = { n: number; lo: number; hi: number; f0: number; f1: number };
/** يقصّ المدَيات على حدود السور بترتيب الإدخال نفسه (القاعدة الواحدة للعرض والصبغ، فلا يختلفان فيما يُعدّ قطعة) */
function cutsOf(spans: (Span | Piece)[]): Cut[] {
  const out: Cut[] = [];
  for (const sp of spans) {
    const [a, b] = Array.isArray(sp) ? sp : [sp.a, sp.b];
    for (let n = surahAt(a); n <= LAST; n++) {
      const [s0, s1] = surahSpan(n);
      if (s0 >= b - EPS) break;
      const lo = Math.max(a, s0), hi = Math.min(b, s1);
      if (hi - lo <= EPS) continue;
      out.push({ n, lo, hi, f0: fracIn(n, lo), f1: fracIn(n, hi) });
    }
  }
  return out;
}
/** يُقَصّ المدى على حدود السور ويُترجَم إلى أرقام آيات، بترتيب الإدخال نفسه. الصفحة p تشغل [p، p+1).
    البداية أول آيةٍ لم تتمّ قبل المدى، والنهاية آخر آيةٍ تمّت فيه (بسماحة ayahAt). والفتات الذي لا يُتمّ آيةً
    (٠٫٠٠١٥ صفحة دخلت الانفطار، أو ذيل النبأ بعد آيتها الأخيرة) لا يُعرَض صفًّا — يُقرأ مع الغد بالمؤشّر الخام —
    إلا أن يكون النصيب كلّه كذلك فتُعرَض الآية التي يقع فيها وحدها (لا التي بعدها، وإلا صبغ فعلُ الصفّ آيةً غيرها).
    فلا يتكرّر صفٌّ بين يومين ولا يظهر «النبأ ٤٠–٤٠».
    الدمج في صفٍّ واحد للمتتابع إلى الأمام فقط (from = آخر السابق + ١): فالمسار الدائري قد يلتفّ داخل نصيب يومٍ
    واحد من ذيل السورة إلى رأسها (هود ١٠٢–١٢٣ ثم هود ١–٦)، ودمجُهما كان يُخفي الرأس من الصفوف مع أن المؤشّر الخام
    تجاوزه، فلا يُقرأ تلك الدورة ولا يصبغه فعل الصفّ. وعبر الالتفاف لا يكون from تاليًا لآخر السابق أبدًا */
export function toSegs(spans: (Span | Piece)[]): Seg[] {
  const out: Seg[] = [];
  let first: Seg | null = null;
  for (const { n, lo, hi, f0, f1 } of cutsOf(spans)) {
    const s = SURAHS[n - 1];
    const from = ayahAt(n, f0).aya + 1, to = ayahAt(n, f1).aya;
    const p0 = Math.max(1, Math.floor(lo + EPS)), p1 = Math.min(TOTAL_PAGES, Math.max(p0, Math.ceil(hi - EPS) - 1));
    if (from > s.ayas || to < from) {
      if (!first) { const k = ayahContaining(n, (f0 + f1) / 2); first = { surah: n, from: k, to: k, pages: hi - lo, p0, p1, f0, f1 }; }
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.surah === n && from === last.to + 1) { last.to = to; last.pages += hi - lo; last.p1 = Math.max(last.p1, p1); last.f1 = f1; }
    else out.push({ surah: n, from, to, pages: hi - lo, p0, p1, f0, f1 });
  }
  if (!out.length && first) out.push(first);
  return out;
}

/* ===== ورد اليوم ===== */
/** موضع اليوم من المسار — به تُشرَح أسباب الاختيار: at صفحات قُطعت من الترتيب، of صفحات المسار،
    day/days اليوم من الدورة وطولها (للمراجعة طولها هو الإعداد نفسه، لا ceil(pool/rate) الذي تُخطئه الكسور).
    days = ٠ يعني «لم يبقَ شيء» فقط؛ ومعدّلٌ صفر وبقي شيء ⇒ days = Infinity وstalled (كالحاسبة C5)، فلا يُعرَض
    «يُختم بعد ٠ يوم» لمن أوقف معدّله — على الواجهة أن تقرأ stalled قبل days */
export type Why = { at: number; of: number; rate: number; day: number; days: number; stalled: boolean };
export type Wird = {
  /** تاريخ الدوحة الذي حُسب له، وهل سُجّل (المسجَّل تُعرَض صفوفه كما قُرئت من log[day].taken، لا ورد الغد) */
  day: string; logged: boolean;
  /** صفحات اليوم كلّها */
  total: number;
  segs: Record<Track, Seg[]>;
  /** صفحات اليوم في كل مسار */
  today: Record<Track, number>;
  /** مدَيات اليوم الخام بترتيب القراءة */
  taken: Record<Track, Span[]>;
  /** صفحات المسار كلّه، وما بقي بلا حفظ */
  pool: Record<Track, number>; left: number;
  /** قطع كل مسار على المصحف (للرسم)؛ new = الفراغات */
  spans: Record<Track, Span[]>;
  rate: Record<Track, number>;
  /** موضع بداية اليوم الفعلي لكل مسار، والمؤشّرات بعد تسجيله */
  cur: Cursors; next: Cursors;
  why: Record<Track, Why>;
  /** اليوم من دورة المراجعة (١..cycle) وأيام ختم الاسترجاع على المعدّل (= why.restore.days: Infinity إن كان المعدّل صفرًا وبقي شيء) */
  cycleDay: number; restoreDays: number;
  /** الحفظ الجديد يُكمل سورةً وقف فيها: اسمها وآخر آيةٍ حفظها منها؛ null = يبدأ سورةً من أولها */
  cont: { surah: number; aya: number } | null;
  /** «يبدأ من» سورةٌ ليست في المسار: يُعلَم بها بدل التجاهل الصامت، ويبدأ من أقرب سورةٍ بعدها في اتجاهه */
  fromMissing: Record<Track, boolean>;
};
export function wirdOf(map: HifzMapT, bands: BandsMapT | undefined, prefs: Prefs, state: State = readState(), day = dohaDate()): Wird {
  // الإعدادات تُنقّى هنا أيضًا لا في readPrefs وحدها: NaN من الواجهة كان يتسرّب إلى النصيب فيُفرغ المسارات بصمت
  const p = normPrefs(prefs);
  const an = analyze(map, bands), rate = rateOf(an, p);
  const cycle = Math.max(1, Math.round(p.cycle));
  const rec = <T,>(f: (k: Track) => T) => ({ new: f("new"), fix: f("fix"), review: f("review"), restore: f("restore") }) as Record<Track, T>;
  const orders = rec((k) => orderOf(an, k, p));
  const first = (o: Order): Pos | null => (o.pieces.length ? { i: 0, x: o.pieces[0].a } : null);
  /* اليوم المسجَّل يُعرَض كما قُرئ (log[day].taken)، لا يُعاد حسابه: فمؤشّره تقدّم وخريطته صُبغت، وإعادة الحساب تُعطي
     ورد الغد تحت علم logged. موضعه في الترتيب: القطعة التي تحوي أوّل ما قُرئ، وإلا أقرب قطعةٍ بعده إن تغيّرت الخريطة
     بعد التسجيل (صفٌّ صُبغ بفعله مثلًا) — يكفي لجملة «قطعتَ كذا من كذا» */
  const was = state.log[day]?.taken;
  const posAt = (o: Order, x: number): Pos | null => { const i = o.pieces.findIndex((q) => q.a - EPS <= x && x < q.b - EPS); return i >= 0 ? { i, x } : locate(o, x) ?? first(o); };
  /* لا قطعة عند المؤشّر أو بعده ⇒ أوّل الترتيب، للمسارات الأربعة: الدائري بطبعه، والجديد لأن الخريطة مصدر الحقيقة —
     فإن بقيت ثغرةٌ خلف المؤشّر في الدوران (المبتدأ التلقائي انتقل إلى ثغرةٍ أدنى منه، أو أزال صاحبه سورةً خلفه)
     فهي تُقرأ لا تُترك: كان الجديد يموت هنا (لا صفوف والمؤشّر لا يتحرّك) بينما الحاسبة تعدّ ما بقي. وانتهاء الثغرات
     حقًّا = لا قطع (pool.new = 0) فلا جديد */
  const pos = rec((k) => (was ? (was[k][0] ? posAt(orders[k], was[k][0][0]) : null) : locate(orders[k], state.cur[k]) ?? first(orders[k])));
  const got = rec((k) =>
    was ? { spans: was[k].map(([a, b]): Piece => ({ n: surahAt(a), a, b })), end: null as Pos | null }
      : pos[k] ? takeFrom(orders[k], pos[k]!, rate[k], k !== "new") : { spans: [] as Piece[], end: null as Pos | null });
  const segs = rec((k) => toSegs(got[k].spans));
  const today = rec((k) => len(got[k].spans));
  /* المؤشّر التالي خامٌ بالصفحات لا ملصوقٌ بالآيات: فيتقدّم كل يومٍ بالنصيب تمامًا، وتبقى دورة المراجعة
     cycle يومًا بالضبط ولا تنزلق آيةً كل دورة. والعرض وحده يُقرَّب إلى الآيات (toSegs) بالقاعدة نفسها في اليومين
     فلا يتكرّر صفٌّ ولا يسقط. وعند آخر الترتيب يعود المؤشّر إلى أوّله للمسارات الأربعة (takeFrom)؛ والجديد وحده
     لا يواصل الأخذ من أوّله في اليوم نفسه (نصيب يومٍ واحد لا يلتفّ فيُعاد ما قُرئ فيه). واليوم المسجَّل مؤشّراته
     هي الحالية (ما كتبه applyLog)، وكذا المسار الذي لم يُقرأ منه شيء */
  const next = rec((k) => {
    const g = got[k];
    return was || !g.spans.length || !g.end ? state.cur[k] : g.end.x;
  });
  const why = rec((k): Why => {
    const of = an.pool[k], r = rate[k];
    const at = pos[k] ? offsetOf(orders[k], pos[k]!) : 0;
    // أيام الختم: لا شيء باقٍ = ٠؛ معدّل صفر وبقي شيء = Infinity (لا ٠، فذاك «الآن» الكاذب الذي أزالته C5 من الحاسبة)
    const days = k === "review" ? cycle : of <= EPS ? 0 : r > 0 ? Math.ceil(of / r - 1e-9) : Infinity;
    // اليوم من الدورة = floor(المقطوع ÷ النصيب) + ١ (المؤشّر خامٌ فالمقطوع مضاعفٌ تامّ للنصيب، والسماحة لكسور الطفو فقط)
    const day = r > 0 && days > 0 && Number.isFinite(days) ? Math.min(days, Math.floor(at / r + 1e-9) + 1) : 1;
    return { at, of, rate: r, day, days, stalled: !Number.isFinite(days) };
  });
  return {
    day, logged: !!state.log[day],
    total: today.new + today.fix + today.review + today.restore,
    segs, today,
    taken: rec((k) => got[k].spans.map(toSpan)),
    pool: an.pool, left: an.left,
    spans: rec((k) => an.pieces[k].map(toSpan)),
    rate,
    // بداية اليوم المسجَّل هي أوّل ما قُرئ فعلًا، لا موضعه في ترتيب اليوم (قد تكون الخريطة صُبغت بعده فانتقلت القطعة)
    cur: rec((k) => (was ? was[k][0]?.[0] ?? null : pos[k]?.x ?? null)), next,
    why,
    cycleDay: why.review.day, restoreDays: why.restore.days,
    cont: contOf(map, bands, segs.new[0]),
    fromMissing: rec((k) => orders[k].fromMissing),
  };
}
/** أتُكمل سورةً وقفتَ فيها؟ فيُقال «تُكمل هودًا من بعد الآية ٦٨». القطعة التي تبدأ على حدّ السورة تمامًا تنتمي
    إلى التالية (v92 نسبتها إلى السابقة المحفوظة كلّها فقالت «تُكمل التوبة من بعد الآية ١٢٩»)، ولا يُقال
    «تُكمل» إلا إن كان في السورة محفوظٌ قبل موضع البدء. والآية هي ما قبل أوّل الصفّ (= from − ١ دائمًا) لا آخر ما
    صُبغ: فإن تقدّم المؤشّر بلا صبغٍ (فشل paintMyRanges أو أعاد صاحبه خريطته) قال الصفّ «هود ٧٨–٨٥» وقالت الجملة
    «من بعد الآية ٦٨». وتُشتقّ من الصفّ الأوّل نفسه لا من أوّل المدَيات الخام: فأوّلها قد يكون فتاتًا أسقطته toSegs
    (ثغرةٌ داخل آيةٍ واحدة من الكوثر قبل فاطر) فتقول الجملة «تُكمل الكوثر» فوق صفٍّ أوّله فاطر ١ */
function contOf(map: HifzMapT, bands: BandsMapT | undefined, first: Seg | undefined): { surah: number; aya: number } | null {
  if (!first) return null;
  const n = first.surah, aya = first.from - 1;
  if (aya <= 0 || !piecesOf(n, map, bands).some(([a]) => a < first.f0 - 1e-9)) return null;
  return { surah: n, aya };
}

/* ===== الصبغ في الخريطة: المحرّك يُرجع المدَيات والواجهة تستدعي hifzApi ===== */
/** نصيب الجديد يُصبَغ new_fix عند التسجيل، والفراغ ينغلق فيمضي المؤشّر.
    حدّا الصبغ بالآيات الصحيحة كما عُرضت، إلا أن يبدأ الفراغ الخام قبل الآية أو ينتهي الفراغ كلّه وسط آية (حدٌّ
    صبغه صاحبه بالكسر في خريطته) فيُصبَغ إلى طرفه حتى لا تبقى فتاتٌ غير مصبوغة. والمؤشّر الخام قد يقف قبل نهاية
    الصبغ أو بعدها بجزء آية: غدًا يبدأ من الأبعد منهما (locate تقصّ البداية إلى max) ويُصبَغ من الأسبق، فلا ثغرة.
    يُحسب من المدَيات الخام المقروءة (taken) لا من الصفوف: فالفتات الذي لا يُتمّ آيةً لا يُعرَض صفًّا، لكن إن كان
    هو كلَّ ما بقي من فراغه (ثغرةٌ داخل آية) وجب صبغه وإلا بقي فراغًا خلف المؤشّر لا يُقرأ حتى لا يبقى غيره.
    والفتات الذي لا يبلغ طرف فراغه يُترك للغد كما كان (مداه صفر بعد التقريب إلى الآيات) */
function gapRanges(taken: Span[], gaps: Span[]): PaintRange[] {
  const out: PaintRange[] = [];
  for (const c of cutsOf(taken)) {
    const gapEnd = gaps.some(([, b]) => Math.abs(b - c.hi) <= EPS);
    const a = Math.min(c.f0, fracOfAyah(c.n, ayahAt(c.n, c.f0).aya)), b = gapEnd ? c.f1 : fracOfAyah(c.n, ayahAt(c.n, c.f1).aya);
    if (b - a <= 1e-9) continue;
    const last = out[out.length - 1];
    // قطعتا السورة نفسها المتلاصقتان مدًى واحد (كما تُدمَجان صفًّا واحدًا)
    if (last && last[0] === c.n && a <= last[2] + 1e-9) last[2] = Math.max(last[2], b);
    else out.push([c.n, a, b]);
  }
  return out;
}
/** صبغ الجديد في المحرّك القديم (wirdOf) */
export function newPaint(w: Wird): PaintRange[] { return gapRanges(w.taken.new, w.spans.new); }
/** صبغةٌ واحدة: مدَياتٌ وحالةٌ تُكتب فيها. الواجهة: paintEntries ثم setMyEntries */
export type RowPaint = { ranges: PaintRange[]; status: Exclude<HifzStatus, "none"> };
/** ما أرجعته paintMyRanges (المدخلات السابقة) ← صورةٌ تُحفَظ في السجل للتراجع */
export function paintedOf(prev: Entry[]): Painted[] {
  return prev.map((e) => ({ surah: e.surah, before: e.bands && e.bands.length ? e.bands : e.status === "none" ? [] : [[0, 1, e.status]] }));
}
/** عكسها: مدخلات تُطبَّق بـ setMyEntries لتعود الخريطة إلى ما كانت */
export const restoreEntries = (painted: Painted[]): Entry[] => painted.map((q) => entryOf(q.surah, q.before));

/* ===== التسجيل والتراجع (دوالّ صافية على الحالة) ===== */
/** حالةٌ من أجزائها: ما فرغ لا يُكتب مفتاحًا (فالحالة القديمة تبقى بشكلها حرفيًا، والفارغة مفتاحاها cur وlog وحدهما) */
function mk(cur: Cursors, log: Record<string, LogEntry>, steps?: Step[], plan?: Plan, wk?: Week, wkAt?: Record<string, Week | null>): State {
  const s: State = { cur, log };
  if (steps && steps.length) s.steps = steps;
  if (plan) s.plan = plan;
  if (wk) s.wk = wk;
  if (wkAt && Object.keys(wkAt).length) s.wkAt = wkAt;
  return s;
}
/** محرّك المؤشّرات القديم: «أنجزت وردي» بضغطةٍ واحدة. مسجَّل من قبل = لا شيء */
export function applyLog(state: State, w: Wird, painted: Painted[] = []): State {
  if (state.log[w.day]) return state;
  const entry: LogEntry = { total: w.total, prev: { ...state.cur }, taken: { new: [...w.taken.new], fix: [...w.taken.fix], review: [...w.taken.review], restore: [...w.taken.restore] } };
  if (painted.length) entry.painted = painted;
  return mk({ ...w.next }, { ...state.log, [w.day]: entry }, state.steps, state.plan, state.wk, state.wkAt);
}
/** التراجع عن يومٍ سُجّل بالضغطة الواحدة: تعود المؤشّرات ويُحذف المدخل، وتُرجَع مدخلات الخريطة التي تعيد ما صُبغ (للواجهة: setMyEntries).
    وإن عاد مؤشّر المراجعة فقد تعود آياتها نفسها قبل أن تمرّ الدورة كلّها: يُمحى عدّ الدورات السليمة (كما jumpTo)، فيؤخّر «متقن» ولا يمنحه */
export function applyUndo(state: State, day: string): { state: State; restore: Entry[] } {
  const e = state.log[day];
  if (!e) return { state, restore: [] };
  const log = { ...state.log }; delete log[day];
  const s = mk({ ...e.prev }, log, state.steps, state.plan, state.wk, state.wkAt);
  return { state: sameAt(e.prev.review, state.cur.review) ? s : resetTally(s), restore: restoreEntries(e.painted ?? []) };
}
/** مؤشّران سواء (null = لم يبدأ) */
const sameAt = (a: number | null, b: number | null) => a === b || (a != null && b != null && Math.abs(a - b) <= EPS);
/** التراجع عن يومٍ مضى من «سجلّي» (أُضيف 2026-11-09 بطلب صاحب المشروع: «ضغطتُ أمس بالخطأ واكتشفتُها اليوم»): يُحذف اليوم
    وكلّ ما سُجّل بعده، وتعود المؤشّرات إلى ما قبله، وتعود الخريطة من صور ما صُبغ. قاعدةٌ واحدة بلا استثناء: التراجع عن يومٍ
    يرجّع ما بعده — فالمؤشّر الخام موضعٌ مطلق، وحذفُ يومٍ من الوسط مع إبقاء ما بعده يُبقي ما بعده مبنيًّا على ما حُذف.
    والأسبوع يعود كما كان قبل أول فعلٍ في ذلك اليوم أو بعده (weekBefore). removed: الأيام المحذوفة مرتّبةً، للتوست ولرفض الطلب الفارغ
    (يومٌ غير مسجَّل: لا شيء يتغيّر). والخريطة تعود بـ rewindEntries (الأيام من الأحدث إلى الأقدم)؛ restore وsteps باقيان لمن يقرؤهما */
export function applyRewind(state: State, day: string): { state: State; restore: Entry[]; removed: string[]; steps: Step[] } {
  const e = state.log[day];
  if (!e || !rewindable(state, day)) return { state, restore: [], removed: [], steps: [] };
  const removed = Object.keys(state.log).filter((d) => isYmd(d) && d >= day).sort();
  const log = { ...state.log };
  const seen = new Set<number>(), painted: Painted[] = [];
  for (const d of removed) {
    for (const q of log[d].painted ?? []) if (!seen.has(q.surah)) { seen.add(q.surah); painted.push(q); }
    delete log[d];
  }
  // خطوات اليوم وما بعده تسقط معه (الأحدث أولًا، لتُعاد خريطتها بـ unpaintEntries)؛ وخطّة يومٍ محذوف تسقط
  const all = state.steps ?? [];
  const gone = all.filter((q) => q.day >= day).reverse();
  const plan = state.plan && state.plan.day >= day ? undefined : state.plan;
  const at = state.wkAt ?? {};
  const wk = weekBefore(state, day);
  const wkAt: Record<string, Week | null> = {};
  for (const d of Object.keys(at)) if (d < day) wkAt[d] = at[d];
  return { state: mk({ ...e.prev }, log, all.filter((q) => q.day < day), plan, wk, wkAt), restore: restoreEntries(painted), removed, steps: gone };
}
/** أيُتراجع عن هذا اليوم من «سجلّي» (لـ LogBody وapplyRewind)؟ مسجَّلٌ، وكل يومٍ من خطوات المحرّك منه فصاعدًا ما زال المخزن يحفظ أثره
    (taken معه، storedState). فيومٌ طواه المخزن سقطت صور صبغه، والتراجع عنه يُبقي ما صبغه («في المراجعة» و«متقن») بلا يومه، فيمنح ما لم يبقَ له أصل.
    والمخزن يحفظ أثر كل يومٍ في مدى «سجلّي» (keepFrom)، فشبكته كلّها يُتراجع إليها كما في الجهاز القديم */
export function rewindable(state: State, day: string): boolean {
  if (!state.log[day]) return false;
  // ويومٌ سجّله جهازٌ قديم لا taken له يُقاس: فإن سبق ما يحفظه المخزن بأثره فقد يكون بعده يومٌ لم يتمّ طوى المخزن خطواته (نجاح خروجٍ مثلًا)
  if (!state.log[day].steps && day < keepFrom(state)) return false;
  return Object.entries(state.log).every(([d, e]) => d < day || !e.steps || !!e.taken);
}
/** «سجلّي» شبكةُ ٤٢ يومًا، في التطبيق وفي الجهاز القديم (v96): إلى أيّ يومٍ فيها يُتراجع */
export const REACH = 42;
/** ما يحفظ المخزن أثره كاملًا: مدى «سجلّي» وأسبوعٌ فوقه، فجهازٌ سجّل أيامًا قبل أن تصله مزامنةٌ تأخّرت (أو ساعته) أسبوعًا يجد ما تراجع إليه
    الجهاز القديم. وأوسع منه يُخرج الصفّ عن ٤٨ ك.ب حين يمتلئ السجلّ أربعمئة يوم (C6) */
const KEEP_DAYS = REACH + 7;
/** أقدم يومٍ يحفظ المخزن أثره: KEEP_DAYS يومًا تنتهي بأحدث يومٍ في الحالة (سجلٌّ أو خطوةٌ أو خطّة). القارئ القديم لا يرى أبعد من ٤٢ يومًا
    من يومه، ويومه لا يسبق أحدث ما كُتب في الصفّ الذي اعتمده */
function keepFrom(s: State): string {
  let top = s.plan?.day ?? "";
  for (const d of Object.keys(s.log)) if (isYmd(d) && d > top) top = d;
  for (const q of s.steps ?? []) if (q.day > top) top = q.day;
  return top ? dayBefore(top, KEEP_DAYS - 1) : "";
}
/* الأسبوع كما كان قبل أول فعلٍ في اليوم أو بعده: صورةُ أول يومٍ فيه فعلٌ منذه (wkAt)، ولم يُفعل بينهما شيء فليس فيها من المحذوف شيء؛
   أو الأسبوع الحاضر إن لم يُفعل منذه شيء (أيامٌ سجّلها جهازٌ قديم وحدها). فإن سقطت تلك الصورة (أقدم من الأربعة عشر المحفوظة) فُقد
   الأسبوع: صورةُ يومٍ أبعد تحمل نتائج أيامٍ حُذفت للتوّ فتمنح ما لم يُكسب، فيبدأ أسبوعٌ من المؤشّرات (B3) — إلا أقساطًا صُبغت حفظًا
   ولم تُختبر بعد آخر «نجحت»: تصير أسبوعًا معادًا (lostWeek)، فلا تدخل القديم الحديث إلا بـ«نجحت» ولو رسب أسبوعها. يؤخّر ولا يمنح */
function weekBefore(state: State, day: string): Week | undefined {
  const at = state.wkAt ?? {};
  const acts = [...(state.steps ?? []).map((q) => q.day), ...Object.keys(at)].filter((d) => isYmd(d) && d >= day).sort();
  if (!acts.length) return state.wk ? cloneWeek(state.wk) : undefined;
  if (hasOwn(at, acts[0])) { const w = at[acts[0]]; return w ? cloneWeek(w) : undefined; }
  return lostWeek(state, day);
}
/** أسبوعٌ معاد من أقساطٍ لم تُختبر: خطوات الجديد (بلا نتيجة) قبل اليوم وبعد آخر نجاحٍ لاختبار الأسبوع، كلُّ ما لم يتكرّر منها قسط
    بترتيب أيامها (فأيام الإعادة واليوم السادس لا تضيف شيئًا)، وأحدثها خمسة على الأكثر (أقساط أسبوعٍ واحد). يبدأ من اليوم نفسه.
    وما حفظه جهازٌ قديم منذ يوم ذلك النجاح لم يغطّه اختبارٌ بعد: يُحمل معه (c)، فلا يدخل القديم الحديث بسقوط الصورة.
    وبلا نجاحٍ قطّ فكلّ ما حفظه: لا يُعرف متى بدأ الأسبوع (قد يكون أول أيامه مراجعةً وحدها)، فالتأخير أسلم من منحه. ويوم النجاح يحفظه المخزن */
function lostWeek(state: State, day: string): Week | undefined {
  const kept = (state.steps ?? []).filter((q) => q.day < day);
  let pass = "";
  for (const q of kept) if (q.k === "new" && q.t === "w" && q.ok && q.day > pass) pass = q.day;
  // ما حفظه جهازٌ قديم منذ ذلك النجاح ليس قسطًا: صفّا «الأسبوع» و«الاختبار» يقرآنه مع الأقساط، فلو عُدّ قسطًا لأزاح أقدم قسطٍ
  // لم يُختبر عن الخمسة فدخل القديم الحديث بلا «نجحت»، ولطُلب حفظ ما حُفظ ثانيةً. هو المحمول (c)
  const o = oldNew(state, pass ? dayBefore(pass) : "", dayBefore(day));
  const p: Span[][] = [];
  let seen: Span[] = o;
  for (const q of kept.filter((s) => s.k === "new" && !s.t && s.day > pass).sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : 0))) {
    const s = minus(q.spans, seen);
    if (faces(s) <= HAS || faces(s) > 62 || s.length > SPAN_MAX) continue;
    p.push(s); seen = or(seen, s);
  }
  // وكلّه من يوم ذلك النجاح فصاعدًا، فلم يغطّه اختبارٌ ولو وقع في صفّه (قسطٌ بقي فراغًا فحُفظ بعده)
  const c = o;
  if (!p.length && faces(c) <= HAS) return undefined;
  const w: Week = { v: 1, n: 1, a: dayBefore(day), p: p.slice(-NEW_DAYS), q: [], k: 1 };
  if (p.length) w.r = true;
  if (faces(c) > HAS) w.c = c;
  return w;
}
/** خريطة التراجع من «سجلّي» (WirdMap.rewind): مدخلات كل سورةٍ مُسّت بعد أن تُعكس الأيام المحذوفة من الأحدث إلى الأقدم على خريطة عملٍ
    واحدة — يومٌ سجّله جهازٌ قديم تعود سوره من صوره (log[d].painted)، ويومٌ له خطوات يُعكس صبغها بمداه (الأحدث أولًا، كما unpaintEntries).
    فالأقدم يغلب حيث تداخلا: صورة يومٍ قديمٍ أحدث تحمل ما صبغته خطوةٌ أقدم منها (نجاح خروجٍ مثلًا)، فلا تبقى «في المراجعة» بلا خطوتها.
    state هي الحالة قبل التراجع، وday0 اليوم المختار؛ يومٌ غير مسجَّل ⇒ [] */
export function rewindEntries(state: State, day0: string, map: HifzMapT, bands: BandsMapT | undefined): Entry[] {
  if (!state.log[day0]) return [];
  const all = state.steps ?? [];
  const days = [...new Set([...Object.keys(state.log).filter(isYmd), ...all.map((q) => q.day)])].filter((d) => d >= day0).sort().reverse();
  const work = new Map<number, Band[]>();
  for (const d of days) {
    // في اليوم نفسه ضغطة الجهاز القديم بعد خطوات الجديد (يومٌ سجّله القديم لا يقبل خطوة)، فصورتها أولًا
    for (const snap of state.log[d]?.painted ?? []) work.set(snap.surah, snap.before);
    for (const q of all.filter((s) => s.day === d).reverse()) unpaintOn(work, q, map, bands);
  }
  return [...work].map(([n, p]) => entryOf(n, p));
}
/* ===== خطوات v97 الباقية لاختباراتها: stepsOf وadoptDay (يومٌ قديم يُحوَّل إلى خطوات). والشاشة لا تدعوهما ===== */
export const stepsOf = (state: State, k: Track): Step[] => (state.steps ?? []).filter((q) => q.k === k);
/** يومٌ سُجّل بالطريقة القديمة (ضغطة واحدة للكل) يُحوَّل إلى خطوات، فيُعرض ويُلغى كغيره. بلا taken (ترحيل v92) أو له خطواتٌ أصلًا: كما هو.
    صورة الجديد القديمة للسورة كلّها بلا مدًى، فتراجعها يعيد السورة كلّها كما كان يفعل applyUndo */
export function adoptDay(state: State, day: string): State {
  const e = state.log[day];
  if (!e || e.steps || !e.taken || (state.steps ?? []).some((q) => q.day === day)) return state;
  const add: Step[] = [];
  for (const k of TRACKS) {
    const spans = e.taken[k] ?? [];
    if (!spans.length) continue;
    const step: Step = { day, k, prev: e.prev[k], next: state.cur[k], spans, pages: spans.reduce((n, [a, b]) => n + (b - a), 0) };
    if (k === "new" && e.painted && e.painted.length) step.painted = e.painted;
    add.push(step);
  }
  if (!add.length) return state;
  const entry: LogEntry = { total: e.total, prev: e.prev, taken: e.taken, steps: true };
  return mk(state.cur, { ...state.log, [day]: entry }, [...(state.steps ?? []), ...add].slice(-STEP_CAP), { day, need: add.map((q) => q.k) }, state.wk, state.wkAt);
}
/** مدخلات الخريطة بعد صبغ مجموعاتٍ من المدَيات، مطويّةً لكل سورة (مدَيان في سورةٍ واحدة مدخلٌ واحد لا مدخلان يمحو ثانيهما الأول) */
export function paintEntries(map: HifzMapT, bands: BandsMapT | undefined, groups: RowPaint[]): Entry[] {
  const work = new Map<number, Band[]>();
  for (const g of groups) for (const [n, a, b] of g.ranges) work.set(n, paint(work.get(n) ?? piecesOf(n, map, bands), a, b, g.status));
  return [...work].map(([n, p]) => entryOf(n, p));
}
/** عكس صبغ خطواتٍ أُلغيت (الأحدث أولًا): في كل مدًى مصبوغ يُعاد ما كان فيه من صورة السورة قبل الصبغ، وما خارجه يبقى كما هو الآن.
    سورةٌ بلا صورة لم يغيّرها الصبغ أصلًا فلا تُمسّ؛ وخطوةٌ بصورةٍ بلا مدًى (محوَّلة من القديم) تعيد السورة كلّها */
export function unpaintEntries(removed: Step[], map: HifzMapT, bands: BandsMapT | undefined): Entry[] {
  const work = new Map<number, Band[]>();
  for (const q of removed) unpaintOn(work, q, map, bands);
  return [...work].map(([n, p]) => entryOf(n, p));
}
/** عكس صبغ خطوةٍ واحدة على خريطة عمل (ما لم يُمسّ منها يُقرأ من الخريطة) */
function unpaintOn(work: Map<number, Band[]>, q: Step, map: HifzMapT, bands: BandsMapT | undefined) {
  if (!q.painted || !q.painted.length) return;
  if (!q.ranges || !q.ranges.length) { for (const snap of q.painted) work.set(snap.surah, snap.before); return; }
  for (const [n, a, b] of q.ranges) {
    const snap = q.painted.find((x) => x.surah === n);
    if (!snap) continue;
    let p = paint(work.get(n) ?? piecesOf(n, map, bands), a, b, "none");
    for (const [f, t, st] of snap.before) { const lo = Math.max(f, a), hi = Math.min(t, b); if (hi - lo > 1e-9) p = paint(p, lo, hi, st); }
    work.set(n, p);
  }
}
/** «يبدأ من»: يضع مؤشّر المسار على أول السورة فورًا (قفزة واحدة صريحة)؛ ٠ = تلقائي (يعود إلى أوّل الترتيب).
    وللمراجعة يُمحى عدّ الدورات السليمة: فالقفزة قد تعيد الآيات نفسها قبل أن تمرّ الدورة كلّها */
export function jumpTo(state: State, k: Track, surah: number): State {
  const s: State = { ...state, cur: { ...state.cur, [k]: surah > 0 ? surahSpan(clampSurah(surah))[0] : null } };
  return k === "review" ? resetTally(s) : s;
}
/** يمحو ما سُمّع من المراجعة دورةً سليمة (قفزةٌ أو تغيير اتجاهها): يؤخّر «متقن» ولا يمنحه */
export function resetTally(state: State): State {
  if (!state.wk || !state.wk.rc) return state;
  const wk = cloneWeek(state.wk); delete wk.rc;
  return { ...state, wk };
}

/* ===== الطريقة الأسبوعية: ما يُسلَّم للشاشة والبوت ===== */
/** كم مرة يُقرأ الصفّ: ٠ = يُسمَّع مرةً اختبارًا، ١ «مرة»، ٢ «مرتين»، ٣ «ثلاث مرات» */
export type Times = 0 | 1 | 2 | 3;
/** دور الصفّ في قسمه: share نصيب المراجعة، window القديم الحديث، exit اختبار خروج، prev1 قسط أمس، prevN الأقساط السابقة،
    noPortion لا قسط اليوم، portion قسط اليوم، week جديد الأسبوع كله، test اختبار الأسبوع، today استرجاع اليوم، yday مقدار أمس */
export type Role = "share" | "window" | "exit" | "prev1" | "prevN" | "noPortion" | "portion" | "week" | "test" | "today" | "yday";
export type Row = { role: Role; spans: Span[]; segs: Seg[]; pages: number; times: Times };
/** زرّ القسم زوجُ نتيجة: r دورة مراجعة، w اختبار الأسبوع؛ ok النتيجة المسجّلة إن سُجّلت */
export type Ask = { kind: "r" | "w"; ok?: boolean };
/** اختبار الخروج المعروض اليوم: الكتلة b وأوّل «حجم القديم الحديث» من أوجهها؛ ok نتيجته إن سُجّلت */
export type ExitAsk = { b: number; spans: Span[]; segs: Seg[]; pages: number; ok?: boolean };
export type DayPart = {
  k: Track;
  /** بترتيب العرض (الصفوف بأدوارها كما في الطريقة) */
  rows: Row[];
  /** أوجه صفوف القسم كلّها، كلّ صفٍّ مرة (مقدار العنوان) */
  pages: number;
  /** خطوته الأصلية اليوم موجودة (القديم الحديث: خطوة النافذة لا الاختبار) */
  done: boolean;
  step?: Step;
  ask?: Ask;
  /** الحفظ الجديد في يومه السابع وقد سُجّلت نتيجته في يومٍ قبله: لا يُطلب اليوم */
  answered?: boolean;
  exit?: ExitAsk;
  /** يومٌ ضيّق: الجديد والاسترجاع ينتظران الغد */
  waits?: boolean;
};
export type Day = {
  day: string;
  logged: boolean;
  /** سجّله جهازٌ قديم (بلا علم steps): يُعرض ولا يُغيَّر */
  legacy: boolean;
  kept: boolean;
  tight: boolean;
  /** موضع اليوم من أسبوع الحفظ؛ null = لا جديد هذا الأسبوع */
  week: { pos: number; n: number; repeat: boolean; portions: number; frozen: boolean } | null;
  /** اليوم من دورة المراجعة؛ null = لا مراجعة */
  cycle: { day: number; days: number } | null;
  /** بترتيب SHOW، وما لا صفوف له لا يُذكر */
  parts: DayPart[];
  /** الأقسام التي يُحفظ بها اليوم، بترتيب TRACKS */
  need: Track[];
  total: number;
  /** مؤشّر كل مسار بعد خطوته */
  next: Cursors;
  /** الأسبوع الذي يقوم عليه اليوم (افتراضيٌّ ما لم يُفعل فيه شيء) */
  wk: Week;
  /** المراجعة: ما تكتبه النتيجة السليمة «متقن» الآن (في المراجعة وقد سُمّع دورةً سليمة قبلُ) */
  promote: Span[];
  /** المراجعة: ما في النصيب من «في المراجعة»، وعليه تقع النتيجة */
  revIn: Span[];
  pool: Record<Track, number>;
  left: { new: number; restore: number };
  fromMissing: Record<Track, boolean>;
  /** الإعدادات بعد التنقية كما حُسب بها اليوم (يعيد بها partSwitch الحساب) */
  prefs: Prefs;
};
export type Act = { kind: "done" } | { kind: "result"; ok: boolean } | { kind: "exit"; ok: boolean };

/* ===== جبر المدَيات: قوائم [a, b) مرتّبة مدموجة، وما دون EPS يسقط ===== */
const HAS = 1e-3;
const cp = ([a, b]: Span): Span => [a, b];
const norm = (xs: Span[]): Span[] => mergeSpans(xs.filter(([a, b]) => b - a > EPS));
function and(a: Span[], b: Span[]): Span[] {
  const x = norm(a), y = norm(b), out: Span[] = [];
  let i = 0, j = 0;
  while (i < x.length && j < y.length) {
    const lo = Math.max(x[i][0], y[j][0]), hi = Math.min(x[i][1], y[j][1]);
    if (hi - lo > EPS) out.push([lo, hi]);
    if (x[i][1] < y[j][1]) i++; else j++;
  }
  return out;
}
function minus(a: Span[], b: Span[]): Span[] {
  const y = norm(b), out: Span[] = [];
  for (const [a0, a1] of norm(a)) {
    let lo = a0;
    for (const [b0, b1] of y) {
      if (b1 <= lo + EPS) continue;
      if (b0 >= a1 - EPS) break;
      if (b0 - lo > EPS) out.push([lo, b0]);
      lo = Math.max(lo, b1);
      if (lo >= a1 - EPS) break;
    }
    if (a1 - lo > EPS) out.push([lo, a1]);
  }
  return out;
}
const or = (a: Span[], b: Span[]): Span[] => norm([...a, ...b]);
const faces = (a: Span[]) => a.reduce((s, [x, y]) => s + (y - x), 0);
const flat = (p: Span[][]): Span[] => norm(p.flat());
const lastOf = <T,>(xs: T[]): T | undefined => xs[xs.length - 1];
const rec = <T,>(f: (k: Track) => T): Record<Track, T> => ({ new: f("new"), fix: f("fix"), review: f("review"), restore: f("restore") });
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const round1 = (x: number) => Math.round(x * 10) / 10;

/** مراحل الخريطة مدَياتٍ على المحور (بقصّ analyze نفسه، بلا الفاتحة): NF حفظ قريب، RV في المراجعة (غير المتقن)، OR منسيّ،
    GAP لم يُحفظ؛ وgaps قطع الفراغ كما هي (لصبغ الجديد إلى طرف فراغه) */
type Stages = { NF: Span[]; RV: Span[]; OR: Span[]; GAP: Span[]; gaps: Span[] };
function stagesOf(an: Analysis, map: HifzMapT, bands?: BandsMapT): Stages {
  const RV: Span[] = [];
  for (const s of SURAHS) {
    if (SKIP.has(s.n)) continue;
    const [a, b] = surahSpan(s.n), w = b - a;
    const at = (f: number) => (f <= 1e-9 ? a : f >= 1 - 1e-9 ? b : a + f * w);
    const list = [...piecesOf(s.n, map, bands)].sort((x, y) => x[0] - y[0]);
    let cur = 0;
    for (const [f, t, st] of list) {
      const f1 = Math.max(f, cur);
      if (t - f1 <= 1e-9) continue;
      if (st === "reviewing") RV.push([at(f1), at(t)]);
      cur = t;
    }
  }
  const sp = (k: Track) => an.pieces[k].map(toSpan);
  return { NF: norm(sp("fix")), RV: norm(RV), OR: norm(sp("restore")), GAP: norm(sp("new")), gaps: sp("new") };
}
/** مدى صبغٍ دقيق: القطع على حدود السور بكسورها */
const toRanges = (spans: Span[]): PaintRange[] =>
  cutsOf(norm(spans)).filter((c) => c.f1 - c.f0 > 1e-9).map((c): PaintRange => [c.n, c.f0, c.f1]);
/** مدى صبغٍ بالآيات كما تُعرض صفوفًا */
const ayahRanges = (spans: Span[]): PaintRange[] =>
  toSegs(spans).map((g): PaintRange => [g.surah, fracOfAyah(g.surah, g.from - 1), fracOfAyah(g.surah, g.to)]).filter(([, a, b]) => b - a > 1e-9);

/* ===== رؤوس الآي على طريق الترتيب ===== */
const firstPos = (o: Order): Pos | null => (o.pieces.length ? { i: 0, x: o.pieces[0].a } : null);
/** كل مؤشّرٍ تالٍ نهايةُ takeFrom لا طرفُ مدًى خام (انظر F3 فوق takeFrom: حدّ السورة يُنسب إلى التالية) */
const posAt = (o: Order, pos: Pos, off: number, wrap: boolean): Pos => takeFrom(o, pos, off, wrap).end;
const ayahEnd = (n: number, k: number) => { const [s0, s1] = surahSpan(n); return s0 + fracOfAyah(n, k) * (s1 - s0); };
/** أصغر آيةٍ من السورة n تنتهي بعد الإحداثيّ x (عدد آياتها + ١ إن لم تبقَ) */
function firstEndAfter(n: number, x: number): number {
  let lo = 1, hi = SURAHS[n - 1].ayas + 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ayahEnd(n, mid) > x + EPS) hi = mid; else lo = mid + 1; }
  return lo;
}
/** موضعٌ وسط آية (مؤشّر v96 خامٌ يتقدّم بالأوجه) يُرجَع إلى أول الآية التي يبدأ منها صبغ الصفّ (ayahAt بسماحتها، كما toSegs وgapRanges)،
    مقصوصًا على أول قطعته: فتبدأ المدَيات حيث يبدأ الصبغ، ولا يبقى بينهما فتاتٌ يصير كتلةً وحده ويأخذ اختبار خروج يومٍ كامل */
function ayahHead(o: Order, pos: Pos): Pos {
  const q = o.pieces[pos.i], [s0, s1] = surahSpan(q.n);
  const a = s0 + fracOfAyah(q.n, ayahAt(q.n, (pos.x - s0) / (s1 - s0)).aya) * (s1 - s0);
  return a < pos.x - EPS ? { i: pos.i, x: Math.max(q.a, a) } : pos;
}
type End = { off: number; x: number };
/** يمشي الترتيب من الموضع كما يمشي takeFrom، ويعدّ كل نهاية آية (أو كل حدّ وجهٍ مع faceOnly؛ وكل إحداثيٍّ صحيح على هذا المحور
    بداية آية) وكل طرف قطعة: off أوجهٌ مقطوعة من الموضع. يقف بعد أول ما يجاوز max؛ وwrap يكمل من أوّل الترتيب دورةً واحدة */
function endsFrom(o: Order, pos: Pos, max: number, wrap: boolean, faceOnly: boolean): End[] {
  const ps = o.pieces, out: End[] = [];
  if (!ps.length) return out;
  const q0 = ps[pos.i];
  const segs: [number, number, number][] = [[q0.n, pos.x, q0.b]];
  for (let j = pos.i + 1; j < ps.length; j++) segs.push([ps[j].n, ps[j].a, ps[j].b]);
  if (wrap) { for (let j = 0; j < pos.i; j++) segs.push([ps[j].n, ps[j].a, ps[j].b]); if (pos.x > q0.a + EPS) segs.push([q0.n, q0.a, pos.x]); }
  let off = 0;
  for (const [n, lo, hi] of segs) {
    if (hi - lo <= EPS) continue;
    const add = (x: number) => { out.push({ off: off + (x - lo), x }); return off + (x - lo) > max; };
    if (faceOnly) { for (let f = Math.floor(lo + EPS) + 1; f < hi - EPS; f++) if (add(f)) return out; }
    else for (let k = firstEndAfter(n, lo), ay = SURAHS[n - 1].ayas; k <= ay; k++) { const x = ayahEnd(n, k); if (x >= hi - EPS) break; if (add(x)) return out; }
    if (add(hi)) return out;
    off += hi - lo;
  }
  return out;
}
/** الأقرب إلى want، والتعادل للأسبق */
function nearest(es: End[], want: number): End | undefined {
  let best: End | undefined;
  for (const e of es) if (!best || Math.abs(e.off - want) < Math.abs(best.off - want) - 1e-12) best = e;
  return best;
}
/** ترتيب قراءة القديم الحديث والجديد: قطعٌ على حدود السور، السور باتجاه الجديد، وداخل السورة إلى الأمام */
function orderSpans(spans: Span[], p: Prefs): Span[] {
  const dir = p.dir.new, anchor = dir === 1 ? FIRST : LAST;
  return cutsOf(norm(spans)).sort((x, y) => rankOf(x.n, anchor, dir) - rankOf(y.n, anchor, dir) || x.lo - y.lo).map((c): Span => [c.lo, c.hi]);
}
/** الأقدم حفظًا أولًا: السورة الأبعد خلف سورة المؤشّر s0 في اتجاه الحفظ أقدم، وداخل السورة ما قبلُ أقدم */
function recency(spans: Span[], p: Prefs, s0: number): Span[] {
  const r = (n: number) => (p.dir.new === 1 ? (s0 - n + N) % N : (n - s0 + N) % N);
  return cutsOf(norm(spans)).sort((x, y) => r(y.n) - r(x.n) || x.lo - y.lo).map((c): Span => [c.lo, c.hi]);
}
/** يقطع القطع (بترتيبها، كلٌّ داخل سورة) عند رؤوس الآي كتلًا لا تزيد على size وجهًا؛ الآية الأطول منه كتلةٌ وحدها.
    كل كتلةٍ مدَياتٌ مدموجة على المحور: فسور جزء عمّ المتلاصقة مدًى واحد لا عشرات (B6) */
function chunk(pieces: Span[], size: number): Span[][] {
  const out: Span[][] = [];
  let cur: Span[] = [], acc = 0;
  for (const [a, b] of pieces) {
    if (b - a <= EPS) continue;
    const n = surahAt(a), xs: number[] = [];
    for (let k = firstEndAfter(n, a), ay = SURAHS[n - 1].ayas; k <= ay; k++) { const x = ayahEnd(n, k); if (x >= b - EPS) break; xs.push(x); }
    xs.push(b);
    let lo = a;
    for (const x of xs) {
      const l = x - lo;
      if (cur.length && acc + l > size + EPS) { out.push(norm(cur)); cur = []; acc = 0; }
      cur.push([lo, x]); acc += l; lo = x;
    }
  }
  if (cur.length) out.push(norm(cur));
  return out.filter((c) => faces(c) > EPS);
}

/* ===== الأسبوع ===== */
/** جديد الأسبوع: weekly وجهًا من مؤشّر الجديد تنتهي عند أقرب رأس آية، مقسومةً خمسة أقساط عند رؤوس الآي الأقرب إلى i × L ÷ ٥
    (L الطول بعد الإلصاق، لا weekly نفسه: فمن هود ٨٤ بثلاثة أوجه تقع الحدود على ٨٧ و٩٣ و٩٨ و١٠٥ كما في الشرح، و× ٣ ÷ ٥ تعطي ٩٢).
    وإن كانت آيات الأسبوع خمسًا أو أقل فلكل آيةٍ قسط. كل قسطٍ مدَياتٌ مدموجة على المحور */
export function planWeek(an: Analysis, prefs: Prefs, curNew: number | null): Span[][] {
  const p = normPrefs(prefs), W = p.weekly;
  if (W <= EPS) return [];
  const o = orderOf(an, "new", p);
  const at = locate(o, curNew) ?? firstPos(o);
  if (!at) return [];
  const pos = ayahHead(o, at);
  const E = endsFrom(o, pos, W + 1.5, false, false);
  const end = nearest(E, W);
  if (!end) return [];
  const L = end.off, A = E.filter((e) => e.off <= L + 1e-12);
  const cuts: number[] = [];
  if (A.length <= NEW_DAYS) for (let j = 0; j < A.length; j++) cuts.push(j);
  else {
    let prev = -1;
    for (let i = 1; i < NEW_DAYS; i++) {
      const want = (i * L) / NEW_DAYS;
      let best = -1;
      for (let j = prev + 1; j <= A.length - 1 - (NEW_DAYS - i); j++) if (best < 0 || Math.abs(A[j].off - want) < Math.abs(A[best].off - want) - 1e-12) best = j;
      cuts.push(best); prev = best;
    }
    cuts.push(A.length - 1);
  }
  const out: Span[][] = [];
  let from = 0;
  for (const c of cuts) {
    const to = A[c].off;
    const sp = norm(takeFrom(o, posAt(o, pos, from, false), to - from, false).spans.map(toSpan));
    if (faces(sp) > EPS) out.push(sp);
    from = to;
  }
  return out;
}
function cloneWeek(w: Week): Week {
  const y: Week = {
    v: 1, n: w.n, a: w.a, p: w.p.map((x) => x.map(cp)),
    q: w.q.map((b) => { const o: Block = { id: b.id, s: b.s.map(cp) }; if (b.hold) o.hold = b.hold; return o; }), k: w.k,
  };
  if (w.r) y.r = true;
  if (w.t) y.t = { d: w.t.d, ok: w.t.ok };
  if (w.z && w.z.length) y.z = [...w.z];
  if (w.rc && w.rc.length) y.rc = w.rc.map(cp);
  if (w.c && w.c.length) y.c = w.c.map(cp);
  return y;
}
function clonePlan(pl: Plan): Plan {
  const c: Plan = { day: pl.day, need: [...pl.need] };
  if (pl.cur && pl.next && pl.taken && pl.today) {
    c.cur = { ...pl.cur }; c.next = { ...pl.next }; c.today = { ...pl.today };
    c.taken = rec((k) => pl.taken![k].map(cp));
  }
  if (pl.tight) c.tight = true;
  if (pl.x) c.x = { b: pl.x.b, s: pl.x.s.map(cp) };
  return c;
}
/** خطّة اليوم السارية: ليومها، بأجزائها الأربعة، ومع أسبوعٍ محفوظ. خطّة v97 بلا أسبوع (أجهزة صاحب المشروع) وخطّةٌ ناقصة
    (يومٌ قديم حوّلته adoptDay) كأن لم تكن (B1, C4): وإلا قرأ dayOf حقولًا غائبة وانهار */
function planOf(state: State, day: string): Plan | undefined {
  const pl = state.plan;
  return pl && pl.day === day && pl.cur && pl.next && pl.taken && pl.today && state.wk ? pl : undefined;
}
/** الأيام المحسوبة من الأسبوع قبل اليوم: المحفوظة بعد بدايته، بلا الضيّقة. التقويم لا يدخل */
function counted(log: Record<string, LogEntry>, w: Week, day: string): string[] {
  const z = new Set(w.z ?? []);
  return Object.keys(log).filter((d) => isYmd(d) && d > w.a && d < day && !z.has(d)).sort();
}
/** ما استُرجع بعد after حتى upTo: ما قُرئ وما صُبغ معًا (الصبغ بالآيات قد يجاوز المقروء بفتات آية، فلا يبقى الفتات خارجهما كتلةً وحده) */
const restoredIn = (state: State, after: string, upTo: string): Span[] =>
  (state.steps ?? []).filter((s) => s.k === "restore" && s.day > after && s.day <= upTo).flatMap((s) => [...s.spans, ...axisOf(s.ranges ?? [])]);
/** مدى الصبغ [سورة، من، إلى] على المحور، بقصّ analyze نفسه (طرفا السورة بعينهما) */
const axisOf = (ranges: PaintRange[]): Span[] => ranges.map(([n, a, b]): Span => {
  const [s0, s1] = surahSpan(n), at = (f: number) => (f <= 1e-9 ? s0 : f >= 1 - 1e-9 ? s1 : s0 + f * (s1 - s0));
  return [at(a), at(b)];
});
/** جديد هذا الأسبوع وما استُرجع فيه: يبقيان خارج القديم الحديث حتى ينتهي الأسبوع. ومنه ما حفظه جهازٌ قديم خارج أقساطه (extraOf) */
const excl = (w: Week, state: State, day: string, st: Stages): Span[] => norm([...flat(w.p), ...restoredIn(state, w.a, day), ...extraOf(w, state, day, st)]);
/** ما قرأه جهازٌ قديم جديدًا في أيامه بعد lo حتى hi (شاملًا)، بحدود صبغه (gapRanges): من أول الآية التي يبدأ فيها، وإلى آخر آيةٍ عدّها
    ayahAt تامّة ولو بقي منها دون ٠٫٠١٥ وجه بعد ما قُرئ — فلا يبقى من صبغه فتاتٌ يصير كتلة */
function oldNew(state: State, lo: string, hi: string): Span[] {
  const out: Span[] = [];
  for (const [d, e] of Object.entries(state.log)) if (isYmd(d) && d > lo && d <= hi && !e.steps && e.taken) out.push(...e.taken.new);
  const wide = (c: Cut): PaintRange => [c.n, Math.min(c.f0, fracOfAyah(c.n, ayahAt(c.n, c.f0).aya)), Math.max(c.f1, fracOfAyah(c.n, ayahAt(c.n, c.f1).aya))];
  return out.length ? norm(axisOf(cutsOf(out).map(wide))) : [];
}
/** جديدٌ حفظه جهازٌ قديم خارج أقساط الأسبوع (v96 يحفظ من مؤشّره في اليوم السادس والسابع وفي الأسبوع المعاد، ويصبغه حفظًا قريبًا): هو جديد
    هذا الأسبوع لا قديمٌ حديث — يُقرأ مع جديده ويُسمَّع في اختباره، ولا يدخل القديم الحديث إلا بـ«نجحت». ومعه ما حُمل من أسبوعٍ قبله (w.c).
    على الحفظ القريب الحيّ وحده: ما أعاد صاحبه صبغه (إعلانٌ بيده) ليس جديدًا */
function extraOf(w: Week, state: State, day: string, st: Stages): Span[] {
  return minus(and(or(w.c ?? [], oldNew(state, w.a, dayBefore(day))), st.NF), flat(w.p));
}

/** «نجحت» في أسبوعٍ يُطوى عند T (X = ما حفظه فيه جهازٌ قديم حتى T، oldOf): ما يدخل القديم الحديث وما يُحمل جديدًا إلى التالي.
    يدخل: أقساطه، وما سُمّع في صفّ الاختبار يومَه مما حفظه جهازٌ قديم (مدَيات خطوة النتيجة نفسها، لا ما يبدو اليوم: آيةٌ أتمّ صبغَها
    يومٌ بعده لم تكن فيه). ويُحمل حفظًا تامًّا (لا يُحفظ ثانيةً ولا يزيد أقساطه): ما حُفظ بعده فلم يغطّه اختبار، وما حفظه جهازٌ قديم
    من يوم الاختبار فصاعدًا ولو كان في صفّه (قسطٌ بقي فراغًا يومَه فحُفظ بعد «نجحت») — فيؤخّر ولا يمنح.
    يقرؤها baseOf عند الطيّ وfreshSpans قبله: فما تقول الخريطة إنه صار «قريبًا» هو ما يدخل القديم الحديث نفسه */
function passSplit(w: Week, state: State, st: Stages, T: string, X: Span[]): { enter: Span[]; carry: Span[] } {
  const tested = lastOf((state.steps ?? []).filter((q) => q.k === "new" && q.t === "w" && q.day === w.t!.d))?.spans ?? [];
  const late = and(oldNew(state, dayBefore(w.t!.d), T), st.NF), seen = minus(and(X, tested), late);
  return { enter: minus(or(flat(w.p), seen), late), carry: or(minus(X, seen), late) };
}

type Ctx = { an: Analysis; p: Prefs; st: Stages; state: State; day: string };
/** الأسبوع الذي يبدأ منه اليوم: من المحفوظ، أو جديدٌ افتراضيّ؛ يُطوى إن تمّ (سبعة أيام محسوبة ونتيجة اختبار إن كان فيه جديد)،
    ويُنظَّف على الخريطة الحيّة، وما صُبغ «حفظًا قريبًا» خارج الكتل يُصفّ كتلًا بالأحدثية. moved = جديدٌ أو طُوي: أقساطه تتبع الإعدادات */
function baseOf(w0: Week | undefined, c: Ctx): { w: Week; moved: boolean } {
  const { an, p, st, state, day } = c, cur = state.cur;
  let moved = false, w: Week;
  if (!w0) { w = { v: 1, n: 1, a: state.log[day] ? day : dayBefore(day), p: planWeek(an, p, cur.new), q: [], k: 1 }; moved = true; }
  else w = cloneWeek(w0);
  const enter = (spans: Span[]) => { for (const ch of chunk(orderSpans(spans, p), p.recent)) w.q.push({ id: w.k++, s: ch }); };
  const restored = (T: string) => norm(restoredIn(state, w.a, T));
  const turn = (T: string) => { w.n += 1; w.a = T; delete w.t; delete w.z; moved = true; };
  /** جديد الأسبوع من جهازٍ قديم حتى اليوم hi (شاملًا) مع المحمول إليه (extraOf) */
  const oldOf = (hi: string) => minus(and(or(w.c ?? [], oldNew(state, w.a, hi)), st.NF), flat(w.p));
  const carry = (x: Span[]) => { if (faces(x) > HAS) w.c = x; else delete w.c; };
  for (let guard = 0; guard < 60; guard++) {
    const C = counted(state.log, w, day);
    if (C.length < 7) break;
    let T = C[6];
    // أسبوعٌ فيه جديد (أقساطه، أو ما حفظه جهازٌ قديم فيه): لا ينتهي بلا نتيجة؛ وينتهي عند أول يومٍ محسوب من يوم النتيجة، لا قبل السابع (B4)
    const has = w.p.length > 0 || faces(oldOf(T)) > HAS;
    if (has) {
      const t = w.t;
      if (!t) break;
      const i = C.findIndex((d) => d >= t.d);
      if (i < 0) break;
      T = C[Math.max(6, i)];
    }
    // ما استُرجع في الأسبوع يدخل دائمًا، ثم جديده بعد «نجحت» (أحدث من مسترجَعه)؛ وما حفظه جهازٌ قديم يُقسم بينهما بـ passSplit
    const X = oldOf(T);
    enter(restored(T));
    if (has && w.t!.ok) {
      const s = passSplit(w, state, st, T, X);
      enter(s.enter); w.p = planWeek(an, p, cur.new); delete w.r; carry(s.carry);
    } else if (has) { w.r = true; carry(X); }
    else { w.p = planWeek(an, p, cur.new); carry(X); }
    turn(T);
  }
  // رفع الجديد من صفر وسط أسبوعٍ بلا أقساط: يبدأ أسبوعٌ جديد الآن، لا بعد أن يتمّ الفارغ سبعة أيام (C10). وما حفظه فيه جهازٌ قديم يُحمل معه
  if (w0 && !w.p.length && p.weekly > EPS) {
    const np = planWeek(an, p, cur.new);
    if (np.length) {
      const C = counted(state.log, w, day);
      if (C.length) { const T = C[C.length - 1], X = oldOf(T); enter(restored(T)); turn(T); carry(X); }
      w.p = np; delete w.r; moved = true;
    }
  }
  // التنظيف على الخريطة الحيّة: الحبس لأسبوعه وحده، والكتلة التي لم يبقَ منها حفظٌ قريب تسقط، والعدّ على ما في المراجعة فقط
  for (const b of w.q) if (b.hold && b.hold !== w.a) delete b.hold;
  w.q = w.q.filter((b) => faces(and(b.s, st.NF)) > HAS);
  if (w.rc) { const rc = and(w.rc, st.RV); if (rc.length) w.rc = rc; else delete w.rc; }
  // حفظٌ قريب لا كتلة له (تثبيت ما قبل الترقية، صفٌّ جرّده جهازٌ قديم، صبغٌ باليد): كتلٌ أحدث من الموجود، الأقدم أولًا
  const U = minus(minus(st.NF, w.q.flatMap((b) => b.s)), excl(w, state, day, st)).filter(([a, b]) => b - a > HAS);
  if (faces(U) > HAS) {
    const s0 = cur.new != null ? surahAt(cur.new) : orderOf(an, "new", p).anchor;
    for (const ch of chunk(recency(U, p, s0), p.recent)) w.q.push({ id: w.k++, s: ch });
  }
  capBlocks(w);
  return { w, moved };
}
/** ستون كتلةً على الأكثر: تُدمج الأقدم في التي تليها ولا تُحذف كتلة (وإلا عاد ما فيها حفظًا قريبًا بلا ترتيب) */
function capBlocks(w: Week) {
  while (w.q.length > BLOCK_CAP) {
    const [a, b] = w.q;
    a.s = norm([...a.s, ...b.s]); delete a.hold;
    w.q.splice(1, 1);
  }
}
const BLOCK_CAP = 60;

/* ===== ورد اليوم ===== */
const row = (role: Role, spans: Span[], times: Times): Row => ({ role, spans, segs: toSegs(spans), pages: faces(spans), times });
/** الصفّ الذي تقوم عليه خطوة القسم */
function mainOf(x: DayPart): Row | undefined {
  if (x.k === "new") return lastOf(x.rows);
  return x.rows.find((r) => r.role === (x.k === "review" ? "share" : x.k === "fix" ? "window" : "today"));
}
/** نصيب المراجعة على شبكةٍ ثابتة: اليوم k من الدورة ينتهي عند رأس الآية الأقرب إلى k × pool ÷ cycle، فلا تنزلق الدورة آيةً كل مرة،
    وآخر يومٍ ينتهي بآخر المحفوظ */
function shareOf(o: Order, pool: number, rate: number, cur: number | null): { kk: number; spans: Span[]; next: number } {
  const p0 = firstPos(o)!;
  let pos = locate(o, cur) ?? p0, at = offsetOf(o, pos);
  if (at >= pool - EPS) { pos = p0; at = 0; }
  const kk = Math.floor((at + rate / 2) / rate) + 1, target = Math.min(pool, kk * rate);
  const end = nearest(endsFrom(o, p0, pool + 1, false, false).filter((e) => e.off > at + EPS), target);
  const endOff = !end || target >= pool - EPS || pool - end.off < EPS ? pool : end.off;
  const t = takeFrom(o, pos, endOff - at, true);
  return { kk, spans: t.spans.map(toSpan), next: t.end.x };
}
/** نصيب الاسترجاع: المقدار الصحيح ينتهي على حدّ وجه، والكسر على رأس آية */
function restoreShare(o: Order, pool: number, want: number, cur: number | null): { spans: Span[]; next: number } {
  const pos = ayahHead(o, locate(o, cur) ?? firstPos(o)!);
  let t: ReturnType<typeof takeFrom>;
  if (want >= pool - EPS) t = takeFrom(o, pos, pool, true);
  else {
    const whole = Math.abs(want - Math.round(want)) < EPS;
    const end = nearest(endsFrom(o, pos, want + 1.5, true, whole).filter((e) => e.off > EPS), want);
    t = takeFrom(o, pos, end ? end.off : want, true);
  }
  return { spans: t.spans.map(toSpan), next: t.end.x };
}
/** مقدار أمس في الاسترجاع: آخر ما استُرجع بعد بداية الأسبوع a وقبل اليوم — خطوة استرجاع (وإن كانت بلا مدًى: يومٌ لم يُقرأ فيه إلا أمسُه)،
    أو taken.restore ليومٍ سجّله جهازٌ قديم (لا خطوة له)، أيّهما أحدث. يومٌ فائت أو ضيّق لا يُحسب، فأمسُ بعده آخرُ ما استُرجع */
function ydayOf(state: State, a: string, day: string): Span[] {
  let d0 = "", out: Span[] = [];
  for (const q of state.steps ?? []) if (q.k === "restore" && q.day > a && q.day < day && q.day >= d0) { d0 = q.day; out = q.spans; }
  for (const [d, e] of Object.entries(state.log)) if (isYmd(d) && d > a && d < day && d > d0 && !e.steps && e.taken) { d0 = d; out = e.taken.restore; }
  return out;
}
/** بيانات v97 على جهاز صاحب المشروع (خطواتٌ بلا أسبوع): خطوة جديدٍ ضغطها v97 اليوم ولم يُحفظ اليوم تُطوى، ويعود مؤشّرها إلى ما قبلها.
    وإلا عُدّ قسم الجديد تامًّا بها والأسبوع الجديد مخطّطٌ من بعدها، فلا يُحفظ قسطه الأول ثلاثًا ولا يُصبغ ويبقى ثغرةً خلف المؤشّر.
    وما صبغه v97 يبقى في الخريطة حفظًا قريبًا كسائر ما قبل الترقية. ومع أسبوعٍ محفوظ لا شيء من v97 (أول فعلٍ يكتب الأسبوع) */
function upgraded(state: State, day: string): State {
  if (state.wk || state.log[day]) return state;
  const all = state.steps ?? [], v97 = all.filter((q) => q.day === day && q.k === "new");
  if (!v97.length) return state;
  return mk({ ...state.cur, new: v97[0].prev }, state.log, all.filter((q) => !v97.includes(q)), state.plan, state.wk, state.wkAt);
}
/** ورد اليوم بالطريقة: الأقسام الأربعة بترتيبها وصفوفها وعدد كل صفّ، والأسبوع وموضعه، وما يُحفظ به اليوم.
    بلا خطّة يُحسب من الخريطة والمؤشّرات والأسبوع؛ ومع خطّة اليوم تُقرأ الأنصبة كما ثُبّتت عند أول فعل، فلا يتبدّل ما يراه بصبغ قسمٍ آخر */
export function dayOf(map: HifzMapT, bands: BandsMapT | undefined, prefs: Prefs, state0: State, day = dohaDate()): Day {
  const p = normPrefs(prefs);
  const state = upgraded(state0, day);
  const an = analyze(map, bands), st = stagesOf(an, map, bands);
  const e = state.log[day];
  const logged = !!e, legacy = logged && !e.steps;
  const plan = planOf(state, day);
  const mine = (state.steps ?? []).filter((q) => q.day === day);
  /* يومٌ سجّله جهازٌ قديم يُعرض كما قُرئ فيه (log[day].taken، كما كان wirdOf يفعل)، لا بأنصبةٍ من مؤشّراتٍ قدّمها تسجيله:
     تلك أنصبة الغد، فتُعرض «سُجّلت» وهي لم تُقرأ ثم تأتي غدًا ثانيةً. بلا taken (ترحيل v92) يُحسب كما كان */
  const asRead = legacy && e.taken && !mine.length ? e.taken : undefined;
  const stepOf = (k: Track) => lastOf(mine.filter((q) => q.k === k && q.t !== "x"));
  let w: Week, frozen: boolean;
  if (plan) { w = state.wk!; frozen = true; }
  else { const b = baseOf(state.wk, { an, p, st, state, day }); w = b.w; frozen = !b.moved; }
  const pos = Math.min(7, counted(state.log, w, day).length + 1);
  const X = extraOf(w, state, day, st), E = excl(w, state, day, st);
  const present = (k: Track) => !plan || plan.today![k] > HAS || mine.some((q) => q.k === k);
  const next: Cursors = { ...state.cur };
  const parts: DayPart[] = [];
  const part = (k: Track, rows: Row[], s?: Step, ask?: Ask): DayPart => {
    const x: DayPart = { k, rows, pages: rows.reduce((n, r) => n + r.pages, 0), done: !!s };
    if (s) x.step = s;
    if (ask) x.ask = ask;
    return x;
  };

  // ١. المراجعة: نصيب اليوم من الدورة مرة. وفيه ما في المراجعة ولم يُتقن ⇒ زرّه نتيجة
  let cycle: Day["cycle"] = null, promote: Span[] = [], revIn: Span[] = [];
  {
    const o = orderOf(an, "review", p), pool = len(o.pieces), s = stepOf("review");
    const days = Math.max(1, Math.round(p.cycle));
    const from = asRead ? asRead.review[0]?.[0] ?? state.cur.review : plan ? plan.cur!.review : s ? s.prev : state.cur.review;
    const live = pool > EPS ? shareOf(o, pool, pool / days, from) : null;
    if (live) cycle = { day: Math.min(days, live.kk), days };
    if (asRead) { if (faces(asRead.review) > EPS) parts.push(part("review", [row("share", asRead.review, 1)])); }
    // مع الخطّة يبقى النصيب المثبَّت ولو تغيّرت الخريطة بعده، وإلا ما اكتمل اليوم أبدًا
    else if (plan ? present("review") : !!s || !!live) {
      const S = s ? s.spans : plan ? plan.taken!.review : live!.spans;
      if (faces(S) > EPS) {
        next.review = s ? s.next : plan ? plan.next!.review : live!.next;
        revIn = and(S, st.RV);
        promote = and(revIn, w.rc ?? []);
        let ask: Ask | undefined;
        if (s) { if (s.t === "r") ask = { kind: "r", ok: !!s.ok }; }
        else if (faces(revIn) > EPS) ask = { kind: "r" };
        parts.push(part("review", [row("share", S, 1)], s, ask));
      }
    }
  }

  // ٢. القديم الحديث: أحدث الكتل ما دام مجموعها في الحجم (والأحدث دائمًا) مرة، والمحبوسة معها؛ وما خرج منها مستحقٌّ لاختبار الخروج
  if (asRead) { if (faces(asRead.fix) > HAS) parts.push(part("fix", [row("window", asRead.fix, 1)])); }
  else {
    const liveOfBlock = (b: Block) => minus(and(b.s, st.NF), E);
    const win: Span[] = [], due: { b: Block; s: Span[] }[] = [];
    let acc = 0, full = false, first = true;
    for (let i = w.q.length - 1; i >= 0; i--) {
      const b = w.q[i], lv = liveOfBlock(b), f = faces(lv);
      if (f <= HAS) continue;
      if (b.hold === w.a) { win.push(...lv); continue; }
      if (!full && (first || acc + f <= p.recent + EPS)) { win.push(...lv); acc += f; first = false; }
      else { full = true; due.unshift({ b, s: lv }); }
    }
    const s = stepOf("fix"), xs = lastOf(mine.filter((q) => q.k === "fix" && q.t === "x"));
    const Wn = s ? s.spans : plan ? plan.taken!.fix : orderSpans(win, p);
    let exit: { b: number; spans: Span[]; ok?: boolean } | undefined;
    if (xs) { exit = { b: xs.b ?? -1, spans: xs.spans }; if (xs.ok !== undefined) exit.ok = xs.ok; }
    else if (plan) exit = plan.x ? { b: plan.x.b, spans: plan.x.s } : undefined;
    else if (due.length) exit = { b: due[0].b.id, spans: orderSpans(chunk(orderSpans(due[0].s, p), p.recent)[0] ?? [], p) };
    const rows: Row[] = [];
    if (faces(Wn) > HAS) rows.push(row("window", Wn, 1));
    if (exit && faces(exit.spans) > EPS) rows.push(row("exit", exit.spans, 0));
    else exit = undefined;
    if (rows.length && present("fix")) {
      const x = part("fix", rows, s);
      if (exit) { const r = lastOf(rows)!; x.exit = { b: exit.b, spans: exit.spans, segs: r.segs, pages: r.pages }; if (exit.ok !== undefined) x.exit.ok = exit.ok; }
      parts.push(x);
    }
  }

  // ٣. الحفظ الجديد بموضع اليوم من الأسبوع. وما حفظه جهازٌ قديم خارج أقساطه (X) من جديده: في صفوف الأسبوع كلّه واختباره
  let week: Day["week"] = null;
  if (asRead) {
    if (w.p.length) week = { pos, n: w.n, repeat: !!w.r, portions: w.p.length, frozen };
    if (faces(asRead.new) > EPS) parts.push(part("new", [row("portion", asRead.new, 3)]));
  } else if (w.p.length || faces(X) > HAS) {
    const m = w.p.length, rows: Row[] = [], ws = (xs: Span[]) => orderSpans(xs, p), all = or(flat(w.p), X);
    let main: Row;
    if (pos <= 5 && pos <= m) {
      // ما حفظه جهازٌ قديم هذا الأسبوع من جديده السابق: يُقرأ مع الأقساط السابقة
      if (pos === 2 && faces(X) <= HAS) rows.push(row("prev1", ws(w.p[0]), 1));
      else if (pos >= 2) rows.push(row("prevN", ws(or(w.p.slice(0, pos - 1).flat(), X)), 1));
      main = row("portion", ws(w.p[pos - 1]), 3);
    } else if (pos <= 5) main = row("noPortion", ws(all), 1);
    else if (pos === 6) main = row("week", ws(all), 1);
    else main = row("test", ws(all), 0);
    rows.push(main);
    week = { pos, n: w.n, repeat: !!w.r, portions: m, frozen };
    const s = stepOf("new");
    if (present("new")) {
      let ask: Ask | undefined, answered = false;
      if (pos === 7) {
        const ok = s && s.t === "w" ? s.ok : w.t?.ok;
        ask = ok === undefined ? { kind: "w" } : { kind: "w", ok };
        answered = !!w.t && w.t.d < day;
      }
      /* «يبدأ من» بعد تثبيت الأسبوع يسري من الأسبوع التالي (plan 3.9): أقساطه باقية، لكن إن قفز المؤشّر عن قسط اليوم بقي حيث وُضع،
         وإلا كتب القسطُ فوق القفزة فلم تسرِ أبدًا. والقفزة: مؤشّرٌ غير مؤشّر الخطّة، أو خارج قسط اليوم (لا مساواةٌ ببدايته: مؤشّر v96 وسط آية) */
      if (s) next.new = s.next;
      else if (plan) next.new = sameAt(state.cur.new, plan.cur!.new) ? plan.next!.new : state.cur.new;
      else if (main.role === "portion" && !w.r) {
        const g = and(main.spans, st.GAP);
        if (faces(g) > EPS) {
          const o = orderOf(an, "new", p), at = locate(o, orderSpans(g, p)[0][0]), here = locate(o, state.cur.new) ?? firstPos(o);
          if (at && here) {
            const d0 = offsetOf(o, here) - offsetOf(o, at);
            if (d0 >= -EPS && d0 <= faces(g) + EPS) next.new = posAt(o, at, faces(g), false).x;
          }
        }
      }
      const x = part("new", rows, s, ask);
      if (answered) x.answered = true;
      parts.push(x);
    }
  }

  // ٤. الاسترجاع: مقدار اليوم مرتين، ثم مقدار أمس مرة (لا أمس في أول يومٍ من الأسبوع)
  if (asRead) { if (faces(asRead.restore) > EPS) parts.push(part("restore", [row("today", asRead.restore, 2)])); }
  else {
    const o = orderOf(an, "restore", p), pool = len(o.pieces), s = stepOf("restore");
    let S: Span[] = [], nx: number | null = state.cur.restore;
    if (s) { S = s.spans; nx = s.next; }
    else if (plan) { if (present("restore")) { S = plan.taken!.restore; nx = plan.next!.restore; } }
    else if (pool > EPS && p.restore > EPS) { const r = restoreShare(o, pool, p.restore, state.cur.restore); S = r.spans; nx = r.next; }
    /* «ثم مقدار أمس مرة» يُبنى وحده: فإن نفد المنسيّ اليوم بقي صفّ أمس قسمًا وحده، وضغطته خطوةٌ بلا مدًى فلا يتكرّر أمسُ بعدها.
       وأمسُ آخرُ ما استُرجع في الأسبوع قبل اليوم: خطوةً، أو يومًا سجّله جهازٌ قديم. ومقدارٌ صفرٌ اختاره صاحبه: لا استرجاع ولا أمس */
    const Y = (plan ? present("restore") : !!s || p.restore > EPS) ? ydayOf(state, w.a, day) : [];
    if (faces(S) > EPS || faces(Y) > EPS) {
      const rows: Row[] = [];
      if (faces(S) > EPS) { next.restore = nx; rows.push(row("today", S, 2)); }
      if (faces(Y) > EPS) rows.push(row("yday", Y, 1));
      parts.push(part("restore", rows, s));
    }
  }

  const tight = !!plan?.tight;
  if (tight) for (const x of parts) if (x.k === "new" || x.k === "restore") x.waits = true;
  parts.sort((a, b) => SHOW.indexOf(a.k) - SHOW.indexOf(b.k));
  const need = plan
    ? TRACKS.filter((k) => plan.need.includes(k) && (!tight || k === "review" || k === "fix"))
    : TRACKS.filter((k) => parts.some((x) => x.k === k && !x.answered));
  return {
    day, logged, legacy, kept: logged, tight, week, cycle, parts, need,
    total: asRead ? e.total : parts.filter((x) => !x.waits).reduce((n, x) => n + x.pages, 0),
    next, wk: w, promote, revIn,
    pool: an.pool, left: { new: an.left, restore: an.pool.restore },
    fromMissing: rec((k) => orderOf(an, k, p).fromMissing),
    prefs: p,
  };
}

/* ===== «جديد» في خريطة الحفظ ===== */
/** ما يحمله الورد اليوم جديدَ أسبوعه، على محور الأوجه: أقساط الأسبوع (ما حُفظ منها وما لم يُحفظ بعد)، وما حُمل إليه من أسبوعٍ قبله،
    وما حفظه فيه جهازٌ قديم. هي البيانات نفسها التي تُبقيه خارج القديم الحديث (excl وextraOf)، والأسبوع نفسه الذي يقوم عليه اليوم
    (خطّة اليوم، وإلا baseOf): فلا تقول الخريطة «جديد» لما يقرؤه الورد قريبًا ولا العكس. وبعد «نجحت» وقبل أن يُطوى الأسبوع: ما سيُحمل
    وحده (passSplit)، فيصير الباقي «قريبًا» لحظة النجاح. بلا حالة ورد: أقساطُ أسبوعٍ افتراضيّ كلّها فراغ، فلا «جديد».
    الأقساط التي لم تُحفظ بعد داخلةٌ قصدًا: الورد يصبغ القسط قبل أن يكتب خطوته، فيُرى «جديدًا» من لحظة صبغه.
    الخريطة تعرض منها ما في المخزن «قريب» (lib/hifz.ts freshView)، للعرض وحده: لا تُكتب ولا تُرسل ولا يقرؤها البوت */
export function freshSpans(map: HifzMapT, bands: BandsMapT | undefined, prefs: Prefs, state0: State, day = dohaDate()): Span[] {
  const p = normPrefs(prefs);
  const state = upgraded(state0, day);
  const an = analyze(map, bands), st = stagesOf(an, map, bands);
  const w = planOf(state, day) ? state.wk! : baseOf(state.wk, { an, p, st, state, day }).w;
  const X = extraOf(w, state, day, st);
  if (w.t?.ok) return norm(passSplit(w, state, st, dayBefore(day), X).carry);
  return or(flat(w.p), X);
}

/* ===== التسجيل: ما تفعله كل ضغطة، وعكسها، ومتى يُحفظ اليوم ===== */
/** ما يُصبَغ في الخريطة لضغطةٍ على قسم. أربعةٌ فقط تصبغ: قسط الجديد في أسبوعٍ عادي (فراغ ← حفظ قريب)، والاسترجاع (منسيّ ← حفظ قريب)،
    ونجاح اختبار الخروج (حفظ قريب ← في المراجعة)، والنتيجة السليمة على ما سُمّع دورةً سليمة قبلُ (في المراجعة ← متقن).
    هذا هو الكاتب الوحيد لـ mastered في الورد كلّه؛ و«أتممت» وحدها لا تكتب «في المراجعة» ولا «متقن» أبدًا */
export function partPaint(map: HifzMapT, bands: BandsMapT | undefined, d: Day, k: Track, act: Act): RowPaint | null {
  const x = d.parts.find((q) => q.k === k);
  if (!x || x.waits || d.legacy) return null;
  if (act.kind === "exit" ? !x.exit || x.exit.ok !== undefined : x.done) return null;
  const st = stagesOf(analyze(map, bands), map, bands), m = mainOf(x);
  const out = (ranges: PaintRange[], status: RowPaint["status"]): RowPaint | null => (ranges.length ? { ranges, status } : null);
  if (k === "new" && act.kind === "done") return m && m.role === "portion" && !d.week?.repeat ? out(gapRanges(and(m.spans, st.GAP), st.gaps), "new_fix") : null;
  if (k === "restore" && act.kind === "done") return m ? out(ayahRanges(and(m.spans, st.OR)), "new_fix") : null;
  if (k === "review" && act.kind === "result" && act.ok && x.ask) return out(toRanges(d.promote), "mastered");
  if (k === "fix" && act.kind === "exit" && act.ok) return out(toRanges(and(x.exit!.spans, st.NF)), "reviewing");
  return null;
}
/** أيقبل القسم هذا الفعل الآن؟ النتيجة حيث يُسأل عنها وحدها، و«أتممت» حيث لا يُسأل، ومرةً واحدة في اليوم */
function allowed(d: Day, x: DayPart, act: Act): boolean {
  if (x.waits || d.legacy) return false;
  if (x.k === "fix") return act.kind === "exit" ? !!x.exit && x.exit.ok === undefined : act.kind === "done" && !x.done && x.rows.some((r) => r.role === "window");
  if (x.done) return false;
  if (x.k === "review") return x.ask ? act.kind === "result" : act.kind === "done";
  if (x.k === "new") return d.week?.pos === 7 ? act.kind === "result" : act.kind === "done";
  return act.kind === "done";
}
/** خطّة اليوم وأسبوعه بعد أول فعل: إن لم تكن خطّةٌ سارية ثُبّتت الآن من ورد اليوم، وحُفظ الأسبوع كما كان قبله في wkAt (للتراجع) */
function opened(state: State, d: Day): { plan: Plan; wk: Week; wkAt: Record<string, Week | null> } {
  const pl = planOf(state, d.day), wkAt = { ...(state.wkAt ?? {}) };
  if (pl) return { plan: clonePlan(pl), wk: cloneWeek(state.wk!), wkAt };
  if (!hasOwn(wkAt, d.day)) wkAt[d.day] = state.wk ? cloneWeek(state.wk) : null;
  const of = (k: Track) => d.parts.find((q) => q.k === k);
  const plan: Plan = {
    day: d.day, need: [...d.need], cur: { ...state.cur }, next: { ...d.next },
    taken: rec((k) => { const x = of(k), m = x && mainOf(x); return m ? m.spans.map(cp) : []; }),
    today: rec((k) => of(k)?.pages ?? 0),
  };
  const fx = of("fix");
  if (fx?.exit && fx.exit.ok === undefined) plan.x = { b: fx.exit.b, s: fx.exit.spans.map(cp) };
  return { plan, wk: cloneWeek(d.wk), wkAt: capAt(wkAt) };
}
/** صور الأسبوع للتراجع: أحدث ١٤ يومًا فيها فعل (ما قبلها يُسقط الأسبوع عند التراجع إليه، فيؤخّر ولا يمنح) */
const AT_CAP = 14;
function capAt(at: Record<string, Week | null>): Record<string, Week | null> {
  const keys = Object.keys(at).sort();
  if (keys.length <= AT_CAP) return at;
  const out: Record<string, Week | null> = {};
  for (const k of keys.slice(-AT_CAP)) out[k] = at[k];
  return out;
}
/** ضغطةٌ على قسم: خطوةٌ بنصيبه، ويتقدّم مؤشّره وحده، وتُسجَّل النتيجة في الأسبوع. paint ما صُبغ له (من الواجهة بعد نجاح الصبغ).
    فعلٌ لا يقبله القسم الآن ⇒ الحالة كما هي */
export function partOn(state: State, d: Day, k: Track, act: Act, paint?: { ranges: PaintRange[]; painted: Painted[] }): State {
  const x = d.parts.find((q) => q.k === k);
  if (!x || !allowed(d, x, act)) return state;
  state = upgraded(state, d.day);
  const { plan, wk, wkAt } = opened(state, d);
  const day = d.day, prev = state.cur[k], m = mainOf(x);
  let step: Step;
  if (act.kind === "exit") step = { day, k, prev, next: state.cur.fix, spans: x.exit!.spans.map(cp), pages: x.exit!.pages, t: "x", ok: act.ok, b: x.exit!.b };
  else {
    const spans = (m ? m.spans : []).map(cp);
    if (k === "fix") step = { day, k, prev, next: state.cur.fix, spans, pages: m ? m.pages : 0 };
    else step = { day, k, prev, next: k === "new" && act.kind === "result" ? state.cur.new : d.next[k], spans, pages: x.pages };
    if (act.kind === "result" && k === "review") {
      // ما سُمّع دورةً سليمة قبلُ يُرفع من العدّ (صار متقنًا، أو تعثّر فيه فيبدأ عدّه من جديد)، وما سُمّع الآن سليمًا أول مرة يُعدّ
      const rcDel = and(spans, wk.rc ?? []), rcAdd = act.ok ? minus(d.revIn, wk.rc ?? []) : [];
      step.t = "r"; step.ok = act.ok;
      if (rcDel.length) step.rcDel = rcDel;
      if (rcAdd.length) step.rcAdd = rcAdd;
    }
    if (act.kind === "result" && k === "new") { step.t = "w"; step.ok = act.ok; if (wk.t && wk.t.d < day) step.t0 = { d: wk.t.d, ok: wk.t.ok }; }
  }
  if (paint && paint.ranges.length) { step.ranges = paint.ranges; if (paint.painted.length) step.painted = paint.painted; }
  if (step.t === "r") { const rc = or(minus(wk.rc ?? [], step.rcDel ?? []), step.rcAdd ?? []); if (rc.length) wk.rc = rc; else delete wk.rc; }
  if (step.t === "x" && !step.ok) { const b = wk.q.find((q) => q.id === step.b); if (b) b.hold = wk.a; }
  if (step.t === "w") wk.t = { d: day, ok: !!step.ok };
  const steps = [...(state.steps ?? []), step].slice(-STEP_CAP);
  return syncDay(mk({ ...state.cur, [k]: step.next }, state.log, steps, plan, wk, wkAt), day);
}
/** إلغاء ضغطة اليوم على قسم (which = "x": اختبار الخروج): يعود مؤشّره، وتُعكس نتيجتها في الأسبوع بالضبط. وإن لم يبقَ لليوم فعلٌ
    (وليس ضيّقًا) عاد الأسبوع كما كان قبل أول فعلٍ فيه وسقطت الخطّة. removed للواجهة: unpaintEntries تعيد الخريطة */
export function partOff(state0: State, d: Day, k: Track, which?: "x"): { state: State; removed: Step[] } {
  const state = upgraded(state0, d.day), all = state.steps ?? [];
  let idx = -1;
  for (let i = all.length - 1; i >= 0; i--) {
    const q = all[i];
    if (q.day === d.day && q.k === k && (which === "x" ? q.t === "x" : q.t !== "x")) { idx = i; break; }
  }
  if (idx < 0 || d.legacy) return { state: state0, removed: [] };
  const step = all[idx], steps = all.filter((_, i) => i !== idx);
  let wk = state.wk ? cloneWeek(state.wk) : undefined;
  if (wk) {
    if (step.t === "r") { const rc = or(minus(wk.rc ?? [], step.rcAdd ?? []), step.rcDel ?? []); if (rc.length) wk.rc = rc; else delete wk.rc; }
    if (step.t === "x" && !step.ok) { const b = wk.q.find((q) => q.id === step.b); if (b) delete b.hold; }
    if (step.t === "w") { if (step.t0) wk.t = { d: step.t0.d, ok: step.t0.ok }; else delete wk.t; }
  }
  let plan = state.plan;
  const wkAt = { ...(state.wkAt ?? {}) };
  const mineLeft = steps.some((q) => q.day === d.day), tight = !!(plan && plan.day === d.day && plan.tight);
  if (!mineLeft && !tight) {
    if (hasOwn(wkAt, d.day)) { const was = wkAt[d.day]; wk = was ? cloneWeek(was) : undefined; delete wkAt[d.day]; }
    if (plan && plan.day === d.day) plan = undefined;
  }
  return { state: syncDay(mk({ ...state.cur, [k]: step.prev }, state.log, steps, plan, wk, wkAt), d.day), removed: [step] };
}
/** تبديل النتيجة في خطوةٍ واحدة (B2): يُلغى المسجَّل، ويُعاد حساب اليوم من الحالة الجديدة والخريطة بعد عكس صبغه،
    ثم تُصبَغ النتيجة الأخرى وتُسجَّل. entries مدخلات الخريطة النهائية لكل سورةٍ مُسّت (setMyEntries مرةً واحدة).
    فعلٌ لا يقبله القسم ⇒ لا شيء يتغيّر */
export function partSwitch(state: State, map: HifzMapT, bands: BandsMapT | undefined, d: Day, k: Track, act: Act):
  { state: State; entries: Entry[]; removed: Step[]; paint: RowPaint | null } {
  const none = { state, entries: [] as Entry[], removed: [] as Step[], paint: null };
  const off = partOff(state, d, k, act.kind === "exit" ? "x" : undefined);
  const back = unpaintEntries(off.removed, map, bands);
  const m2 = withEntries(map, bands, back);
  const d2 = dayOf(m2.map, m2.bands, d.prefs, off.state, d.day);
  const paint = partPaint(m2.map, m2.bands, d2, k, act);
  const next = paint ? paintEntries(m2.map, m2.bands, [paint]) : [];
  const painted = paintedOf(next.map((e) => entryOf(e.surah, piecesOf(e.surah, m2.map, m2.bands))));
  const s2 = partOn(off.state, d2, k, act, paint ? { ranges: paint.ranges, painted } : undefined);
  if (s2 === off.state) return none;
  const m3 = withEntries(m2.map, m2.bands, next);
  const touched = [...new Set([...back, ...next].map((q) => q.surah))].sort((a, b) => a - b);
  return { state: s2, entries: touched.map((n) => entryOf(n, piecesOf(n, m3.map, m3.bands))), removed: off.removed, paint };
}
/** «أنجزت وردي» على يومٍ محفوظ: تُلغى خطوات اليوم كلّها، وتعود المؤشّرات والأسبوع كما كانت قبل أول فعل. removed الأحدث أولًا */
export function dayOff(state: State, d: Day): { state: State; removed: Step[] } {
  const all = state.steps ?? [], gone = all.filter((q) => q.day === d.day);
  const pl = state.plan && state.plan.day === d.day ? state.plan : undefined;
  if (!gone.length && !pl) return { state, removed: [] };
  const cur = { ...state.cur };
  if (pl && pl.cur) Object.assign(cur, pl.cur);
  else for (const k of TRACKS) { const f = gone.find((q) => q.k === k); if (f) cur[k] = f.prev; }
  let wk = state.wk;
  const wkAt = { ...(state.wkAt ?? {}) };
  if (hasOwn(wkAt, d.day)) { const was = wkAt[d.day]; wk = was ? cloneWeek(was) : undefined; delete wkAt[d.day]; }
  return { state: syncDay(mk(cur, state.log, all.filter((q) => q.day !== d.day), pl ? undefined : state.plan, wk, wkAt), d.day), removed: [...gone].reverse() };
}
/** «يومي ضيّق»: يكفيه المراجعة والقديم الحديث، ويُحفظ ولا يُحسب من الأسبوع، والجديد والاسترجاع ينتظران الغد.
    يُرفض بعد خطوة جديدٍ أو استرجاع، وعلى يومٍ محفوظ، وحين لا جديد ولا استرجاع، وحين لا مراجعة ولا قديم حديث (لا شيء يُحفظ به اليوم) */
export function tightSet(state: State, d: Day, on: boolean): State {
  if (on) {
    const s = upgraded(state, d.day), mine = (s.steps ?? []).filter((q) => q.day === d.day), has = (k: Track) => d.parts.some((x) => x.k === k);
    if (d.legacy || d.kept || d.tight || mine.some((q) => q.k === "new" || q.k === "restore")) return state;
    if (!has("new") && !has("restore")) return state;
    if (!d.need.some((k) => k === "review" || k === "fix")) return state;
    const { plan, wk, wkAt } = opened(s, d);
    plan.tight = true;
    wk.z = [...new Set([...(wk.z ?? []), d.day])].sort();
    return syncDay(mk(s.cur, s.log, s.steps, plan, wk, wkAt), d.day);
  }
  const mine = (state.steps ?? []).filter((q) => q.day === d.day);
  const pl = planOf(state, d.day);
  if (!pl || !pl.tight) return state;
  let plan: Plan | undefined = clonePlan(pl);
  delete plan.tight;
  let wk: Week | undefined = cloneWeek(state.wk!);
  wk.z = (wk.z ?? []).filter((x) => x !== d.day);
  if (!wk.z.length) delete wk.z;
  const wkAt = { ...(state.wkAt ?? {}) };
  if (!mine.length) {
    if (hasOwn(wkAt, d.day)) { const was = wkAt[d.day]; wk = was ? cloneWeek(was) : undefined; delete wkAt[d.day]; }
    plan = undefined;
  }
  return syncDay(mk(state.cur, state.log, state.steps, plan, wk, wkAt), d.day);
}
/** ما يُتمّه «أنجزت وردي» دفعةً واحدة: أقسام اليوم المطلوبة التي لم تُتمّ ولا تنتظر ولا يُسأل فيها عن نتيجة.
    لا تكون فيه نتيجةٌ أبدًا: النتائج ضغطاتٌ صريحة وحدها */
export function bulkActs(d: Day): { k: Track; act: Act }[] {
  if (d.legacy || d.kept) return [];
  const out: { k: Track; act: Act }[] = [];
  for (const k of SHOW) {
    const x = d.parts.find((q) => q.k === k);
    if (!d.need.includes(k) || !x || x.done || x.waits || x.ask) continue;
    if (k === "fix" && !x.rows.some((r) => r.role === "window")) continue;
    out.push({ k, act: { kind: "done" } });
  }
  return out;
}
/** يشتقّ مدخل اليوم من خطواته: يُحفظ (log[day] بالشكل القديم وعلم steps) حين تتمّ أقسام خطّته المطلوبة ويُجاب اختبار الخروج المعروض.
    المدخل القديم بلا علم لا يُمسّ (سجّله جهازٌ آخر)، وبلا خطّةٍ سارية لا يُحكم */
function syncDay(state: State, day: string): State {
  const old = state.log[day];
  if (old && !old.steps) return state;
  const mine = (state.steps ?? []).filter((q) => q.day === day);
  const log = { ...state.log };
  const done = (): State => mk(state.cur, log, state.steps, state.plan, state.wk, state.wkAt);
  if (!mine.length) { if (!old) return state; delete log[day]; return done(); }
  const pl = planOf(state, day);
  if (!pl) return state;
  const need = pl.need.filter((k) => !pl.tight || k === "review" || k === "fix");
  const has = (k: Track) => mine.some((q) => q.k === k && q.t !== "x");
  const ok = need.every((k) => has(k) || (k === "fix" && !pl.taken!.fix.length)) && (!pl.x || mine.some((q) => q.k === "fix" && q.t === "x"));
  if (ok) log[day] = { total: round1(mine.reduce((n, q) => n + q.pages, 0)), prev: { ...pl.cur! }, taken: takenFrom(mine), steps: true };
  else if (old) delete log[day];
  else return state;
  return done();
}

/* ===== الحالة على الجهاز: localStorage ww-wird-state، مع ترحيل v92 (ww-wird-log) وحذف ww-wird-start ===== */
const KEY = "ww-wird-state", OLD_LOG = "ww-wird-log", OLD_START = "ww-wird-start";
export const emptyState = (): State => ({ cur: { new: null, fix: null, review: null, restore: null }, log: {} });
const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const numOrNull = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
function cursorsOf(src: unknown): Cursors {
  const o = (src ?? {}) as Record<string, unknown>;
  return { new: numOrNull(o.new), fix: numOrNull(o.fix), review: numOrNull(o.review), restore: numOrNull(o.restore) };
}
/** مدَيات خام من المخزن: أزواج أعداد منتهية متزايدة فقط */
const spansOf = (src: unknown): Span[] =>
  Array.isArray(src) ? src.filter((q): q is Span => Array.isArray(q) && numOrNull(q[0]) != null && numOrNull(q[1]) != null && q[1] > q[0]).map(([a, b]) => [a, b]) : [];
function takenOf(src: unknown): Record<Track, Span[]> {
  const o = (src ?? {}) as Record<string, unknown>;
  return { new: spansOf(o.new), fix: spansOf(o.fix), review: spansOf(o.review), restore: spansOf(o.restore) };
}
const MEM = new Set<string>(MEM_ORDER);
/** جزءٌ من المخزن: [عدد، عدد، حالة محفوظة] وإلا null */
const bandOf = (q: unknown): Band | null =>
  Array.isArray(q) && numOrNull(q[0]) != null && numOrNull(q[1]) != null && typeof q[2] === "string" && MEM.has(q[2]) ? [q[0], q[1], q[2] as Band[2]] : null;
/** أجزاء السورة قبل الصبغ كما خُزّنت: كلّها سليمة أو null. جزءٌ فاسد واحد يُسقط صورة السورة كلّها لا نفسَه وحده:
    فالتراجع يكتب before في الخريطة بدل ما صُبغ، وصورةٌ ناقصة تمحو حفظًا؛ وغياب الصورة يُبقي ما صُبغ (أهون) */
function bandsOf(src: unknown): Band[] | null {
  if (!Array.isArray(src)) return null;
  const out: Band[] = [];
  for (const q of src) { const b = bandOf(q); if (!b) return null; out.push(b); }
  return out;
}
const isTrack = (x: unknown): x is Track => typeof x === "string" && (TRACKS as readonly string[]).includes(x);
/** صور ما قبل الصبغ من المخزن: السليم منها وحده */
function paintedIn(src: unknown): Painted[] {
  const out: Painted[] = [];
  if (!Array.isArray(src)) return out;
  for (const q of src) {
    if (!q || typeof q !== "object") continue;
    const { surah: s, before: b } = q as Record<string, unknown>;
    const surah = Math.round(numOrNull(s) ?? 0), before = bandsOf(b);
    if (surah >= 1 && surah <= 114 && before) out.push({ surah, before });
  }
  return out;
}
/** أقصى ما يُحفظ من الخطوات (كل المسارات): خمسٌ في اليوم على الأكثر، فيسع أيام KEEP_DAYS كلّها (يحفظ المخزن أثرها)، ولا يكبر الصفّ بلا حدّ */
const STEP_CAP = 320;
/** حدودٌ واسعة لما يُقرأ من المخزن: الأقساط والكتل مدَياتٌ مدموجة، فتُقاس بالأوجه لا بعدد المدَيات (B6)؛ وعدد المدَيات حدّ أمانٍ فقط */
const SPAN_MAX = 128, RC_MAX = 200, Z_MAX = 400;
/** مدَياتٌ مدموجة كلّها سليمة داخل المحور، أو null إن فسد منها شيء أو جاوزت الحدّ */
function spansAll(src: unknown, max = SPAN_MAX): Span[] | null {
  if (!Array.isArray(src) || !src.length) return null;
  const ok = spansOf(src);
  if (ok.length !== src.length || ok.some(([a, b]) => a < 0 || b > AXIS_END + 1)) return null;
  const m = norm(ok);
  return m.length && m.length <= max ? m : null;
}
const resultOf = (src: unknown): { d: string; ok: boolean } | undefined => {
  const o = src as Record<string, unknown> | null | undefined;
  return o && typeof o === "object" && isYmd(o.d) && typeof o.ok === "boolean" ? { d: o.d, ok: o.ok } : undefined;
};
const intOf = (x: unknown): number | null => (typeof x === "number" && Number.isInteger(x) ? x : null);
/** الأسبوع من المخزن: كلّه أو لا شيء في رأسه وأقساطه (القسط موضعيّ، فناقصُه أسوأ من غيابه، وغيابه يبدأ أسبوعًا جديدًا)،
    وما سواها يُنقّى جزءًا جزءًا. لا تُحذف كتلةٌ بالحدّ: تُدمج الأقدم (وإلا عاد ما فيها حفظًا قريبًا بلا ترتيب) */
function weekIn(raw: unknown): Week | null {
  const o = raw as Record<string, unknown> | null | undefined;
  if (!o || typeof o !== "object" || o.v !== 1 || !isYmd(o.a)) return null;
  const n = intOf(o.n), k0 = intOf(o.k);
  if (n == null || n < 1 || k0 == null || k0 < 1 || !Array.isArray(o.p) || o.p.length > NEW_DAYS) return null;
  const p: Span[][] = [];
  for (const x of o.p) { const s = spansAll(x); if (!s || faces(s) > 62) return null; p.push(s); }
  const q: Block[] = [], ids = new Set<number>();
  let k = k0;
  if (Array.isArray(o.q)) for (const x of o.q) {
    if (!x || typeof x !== "object") continue;
    const b = x as Record<string, unknown>, id = intOf(b.id), s = spansAll(b.s);
    if (id == null || ids.has(id) || !s) continue;
    ids.add(id);
    const blk: Block = { id, s };
    if (isYmd(b.hold)) blk.hold = b.hold;
    q.push(blk);
    if (k <= id) k = id + 1;
  }
  const w: Week = { v: 1, n, a: o.a, p, q, k };
  if (o.r === true) w.r = true;
  const t = resultOf(o.t);
  if (t) w.t = t;
  if (Array.isArray(o.z)) { const z = [...new Set(o.z.filter(isYmd))].sort().slice(-Z_MAX); if (z.length) w.z = z; }
  if (Array.isArray(o.rc)) { const rc = norm(spansOf(o.rc)).slice(0, RC_MAX); if (rc.length) w.rc = rc; }
  // المحمول كلّه أو لا شيء، كالأقساط: لا يُقصّ بالحدّ فيضيع طرفه
  if (o.c !== undefined) { const c = spansAll(o.c, RC_MAX); if (c) w.c = c; }
  capBlocks(w);
  return w;
}
/** ما يُتوقَّع من حقول الخطوة، فيحذف المخزن ما طابقه ويعيده القارئ: قبلها نهايةُ سابقتها في مسارها (وإلا أوّل ما قُرئ)، وبعدها آخر ما قُرئ،
    وأوجهها أوجه ما قُرئ. lastNext ما بعد آخر خطوةٍ قُرئت من كل مسار، بترتيب المصفوفة نفسه في الكتابة والقراءة */
function guessOf(lastNext: Partial<Record<Track, number | null>>, k: Track, spans: Span[]): { prev: number | null; next: number | null; pages: number } {
  const prev = hasOwn(lastNext, k) ? lastNext[k] ?? null : spans[0]?.[0] ?? null;
  // القديم الحديث لا يحرّك مؤشّره (partOn): بعدها ما قبلها
  return { prev, next: k === "fix" ? prev : spans.length ? spans[spans.length - 1][1] : null, pages: faces(spans) };
}
/** ما كان تحت الصبغ بنوع الخطوة نفسه: الجديد على فراغ، والاسترجاع على منسيّ، ونجاح الخروج على حفظٍ قريب، والنتيجة السليمة على «في المراجعة».
    فصورةٌ تطابقه تُخزَّن ٠ وتُبنى عند القراءة بعينها؛ وما خالفه (فتاتٌ عند رأس آية، أو صبغٌ بيدٍ قبله) يبقى كما هو */
function impliedPainted(k: Track, t: Step["t"], ok: boolean | undefined, ranges: PaintRange[]): Painted[] | null {
  const st: HifzStatus | null = k === "new" && !t ? "none" : k === "restore" && !t ? "old_review" : k === "fix" && t === "x" && ok ? "new_fix" : k === "review" && t === "r" && ok ? "reviewing" : null;
  if (!st) return null;
  const out: Painted[] = [];
  for (const [n, a, b] of ranges) {
    let snap = out.find((x) => x.surah === n);
    if (!snap) { snap = { surah: n, before: [] }; out.push(snap); }
    if (st !== "none") snap.before.push([a, b, st]);
  }
  return out;
}
/** ما قُرئ في يومٍ من خطواته (syncDay يكتبه، والقارئ يشتقّه حين حذفه المخزن) */
const takenFrom = (mine: Step[]): Record<Track, Span[]> => rec((k) => norm(mine.filter((q) => q.k === k).flatMap((q) => q.spans)));
/** مدَياتٌ متتابعة يلاصق كلٌّ منها ما قبله تصير مدًى واحدًا، بترتيبها */
function joined(xs: Span[]): Span[] {
  const out: Span[] = [];
  for (const [a, b] of xs) { const l = out[out.length - 1]; if (l && Math.abs(l[1] - a) <= EPS) l[1] = b; else out.push([a, b]); }
  return out;
}
/** صورة أسبوعٍ فرقٌ عن base ({"=":1، الحقول المتغيّرة، "-": ما زال}) ← الصورة كاملة؛ وغيرها كما هي. فرقٌ بلا أصلٍ صالح يسقط */
function undelta(v: unknown, base: unknown): unknown {
  const o = v as Record<string, unknown> | null | undefined;
  if (!o || typeof o !== "object" || o["="] !== 1) return v;
  if (!base || typeof base !== "object") return undefined;
  const w: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [f, x] of Object.entries(o)) if (f !== "=" && f !== "-") w[f] = x;
  if (Array.isArray(o["-"])) for (const f of o["-"]) if (typeof f === "string") delete w[f];
  return w;
}
function sanitize(raw: unknown): State {
  const o = (raw ?? {}) as Record<string, unknown>;
  const st = emptyState();
  st.cur = cursorsOf(o.cur);
  const log = (o.log ?? {}) as Record<string, unknown>, derive = new Set<string>();
  for (const d of Object.keys(log)) {
    if (!isYmd(d)) continue;
    const e = (log[d] ?? {}) as Record<string, unknown>;
    const entry: LogEntry = { total: Math.max(0, numOrNull(e.total) ?? 0), prev: cursorsOf(e.prev) };
    if (Array.isArray(e.painted)) {
      // كان يُقبَل before بمجرّد كونه مصفوفة، فعنصرٌ ليس جزءًا أسقط applyUndo بـ TypeError عند entryOf بدل أن يُهمَل هنا
      const painted: Painted[] = [];
      for (const q of e.painted) {
        if (!q || typeof q !== "object") continue;
        const { surah: s, before: b } = q as Record<string, unknown>;
        const surah = Math.round(numOrNull(s) ?? 0), before = bandsOf(b);
        if (surah >= 1 && surah <= 114 && before) painted.push({ surah, before });
      }
      if (painted.length) entry.painted = painted;
    }
    if (e.taken && typeof e.taken === "object") entry.taken = takenOf(e.taken);
    if (e.steps === true) entry.steps = true;
    // taken = 0: حذفه المخزن لأنه يُشتقّ من خطوات يومه (storedState)، فيُشتقّ بعد قراءتها
    if (e.taken === 0 && entry.steps) derive.add(d);
    st.log[d] = entry;
  }
  // الخطوات والخطّة: ما فسد منها يُهمَل وحده، والباقي يبقى بترتيبه
  let badRc = false;
  if (Array.isArray(o.steps)) {
    const steps: Step[] = [];
    const lastNext: Partial<Record<Track, number | null>> = {};
    let lastDay: unknown;
    for (const q of o.steps) {
      if (!q || typeof q !== "object") continue;
      const x = q as Record<string, unknown>;
      // يومٌ غائب كيوم الخطوة التي قبلها في المصفوفة (storedState)
      const day = hasOwn(x, "day") ? x.day : lastDay;
      lastDay = day;
      if (!isYmd(day) || !isTrack(x.k)) continue;
      // مفتاحٌ غائب حذفه المخزن لأنه متوقَّع (storedState، guessOf): يُعاد بالقاعدة نفسها
      const spans = spansOf(x.spans), g = guessOf(lastNext, x.k, spans);
      const step: Step = {
        day, k: x.k, prev: hasOwn(x, "prev") ? numOrNull(x.prev) : g.prev, next: hasOwn(x, "next") ? numOrNull(x.next) : g.next,
        spans, pages: hasOwn(x, "pages") ? Math.max(0, numOrNull(x.pages) ?? 0) : g.pages,
      };
      lastNext[x.k] = step.next;
      const ranges: PaintRange[] = [];
      if (Array.isArray(x.ranges)) for (const r of x.ranges) {
        if (!Array.isArray(r) || r.length !== 3) continue;
        const n = numOrNull(r[0]), a = numOrNull(r[1]), b = numOrNull(r[2]);
        if (n != null && a != null && b != null && n >= 1 && n <= 114) ranges.push([Math.round(n), a, b]);
      }
      const snap = paintedIn(x.painted);
      if (ranges.length) step.ranges = ranges;
      if (snap.length) step.painted = snap;
      // خطوة النتيجة: نوعها ونتيجتها معًا أو لا شيء؛ وعكس عدّ المراجعة كاملًا لا مقطوعًا (C5): فإن تعذّر سقط العدّ كلّه (يؤخّر ولا يمنح)
      if ((x.t === "r" || x.t === "x" || x.t === "w") && typeof x.ok === "boolean") {
        step.t = x.t; step.ok = x.ok;
        const b = intOf(x.b);
        if (x.t === "x" && b != null) step.b = b;
        if (x.t === "r") for (const key of ["rcAdd", "rcDel"] as const) {
          const v = x[key];
          if (v === undefined) continue;
          const s = Array.isArray(v) ? spansOf(v) : [];
          if (!Array.isArray(v) || s.length !== v.length) badRc = true;
          else { const m = norm(s); if (m.length) step[key] = m; }
        }
        const t0 = resultOf(x.t0);
        if (x.t === "w" && t0) step.t0 = t0;
      }
      // صورةٌ مخزَّنة ٠: ما يقتضيه نوع الخطوة على مداها (impliedPainted)
      if (x.painted === 0 && ranges.length) { const im = impliedPainted(step.k, step.t, step.ok, ranges); if (im) step.painted = im; }
      steps.push(step);
    }
    if (steps.length) st.steps = steps.slice(-STEP_CAP);
  }
  for (const d of derive) { const mine = (st.steps ?? []).filter((q) => q.day === d); if (mine.length) st.log[d].taken = takenFrom(mine); }
  const pl = o.plan as Record<string, unknown> | null | undefined;
  if (pl && typeof pl === "object" && isYmd(pl.day) && Array.isArray(pl.need)) {
    const need = pl.need as unknown[];
    st.plan = { day: pl.day, need: TRACKS.filter((k) => need.includes(k)) };
    const t = pl.today as Record<string, unknown> | null | undefined;
    if (pl.cur && pl.next && pl.taken && t && typeof t === "object") {
      const pg = (k: Track) => Math.max(0, numOrNull(t[k]) ?? 0);
      Object.assign(st.plan, { cur: cursorsOf(pl.cur), next: cursorsOf(pl.next), taken: takenOf(pl.taken), today: { new: pg("new"), fix: pg("fix"), review: pg("review"), restore: pg("restore") } });
    }
    if (pl.tight === true) st.plan.tight = true;
    const px = pl.x as Record<string, unknown> | null | undefined;
    if (px && typeof px === "object") { const b = intOf(px.b), s = spansOf(px.s); if (b != null && s.length) st.plan.x = { b, s }; }
  }
  const wk = weekIn(o.wk);
  if (wk) { if (badRc) delete wk.rc; st.wk = wk; }
  if (o.wkAt && typeof o.wkAt === "object") {
    const at: Record<string, Week | null> = {}, src = o.wkAt as Record<string, unknown>;
    // صورةٌ بمفتاح «=» فرقٌ عن التي بعدها (والأحدث فرقٌ عن الأسبوع الحاضر): تُبنى من الأحدث إلى الأقدم (storedState)
    let base: unknown = o.wk;
    for (const d of Object.keys(src).filter(isYmd).sort().reverse()) {
      const v = undelta(src[d], base);
      base = v;
      if (v === null) at[d] = null;
      else { const w = weekIn(v); if (w) { if (badRc) delete w.rc; at[d] = w; } }
    }
    const capped = capAt(at);
    if (Object.keys(capped).length) st.wkAt = capped;
  }
  return st;
}
/** الحالة من مصدرٍ خارجي غير موثوق (صفّ wird_state على الخادم): التنقية نفسها التي يمرّ بها المخزن المحلي — فالبوت رسولٌ يحسب بالمحرّك ذاته، لا بنسخةٍ منه */
export function stateOf(src: unknown): State { return sanitize(src); }
export function readState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    const oldLog = localStorage.getItem(OLD_LOG), oldStart = localStorage.getItem(OLD_START);
    if (raw != null) {
      if (oldLog != null || oldStart != null) { localStorage.removeItem(OLD_LOG); localStorage.removeItem(OLD_START); }
      return sanitize(JSON.parse(raw));
    }
    // ترحيل v92: مصفوفة تواريخ ← مدخلات فارغة (لا صفحات ولا مؤشّرات قبلها)، ثم يُحذف المفتاحان القديمان
    const st = emptyState();
    if (oldLog != null) {
      try { for (const d of JSON.parse(oldLog) as unknown[]) if (isYmd(d)) st.log[d] = { total: 0, prev: { ...st.cur } }; } catch {}
    }
    if (oldLog != null || oldStart != null) { localStorage.removeItem(OLD_LOG); localStorage.removeItem(OLD_START); writeState(st); }
    return st;
  } catch { return emptyState(); }
}
export function writeState(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(storedState(s))); } catch {}
  wrote();
}
/* من يعرض «جديد» (خريطة الحفظ وصفحتها) يُخبَر بكل كتابةٍ للحالة أو الإعدادات على هذا الجهاز: المتصفح لا يُخبر الصفحة بما كتبته هي،
   و«نجحت» لا تصبغ شيئًا فلا تتغيّر الخريطة بعدها. الإخبار وحده: لا يُحسب هنا شيء */
const writes = new Set<() => void>();
export function onWirdWrite(f: () => void): () => void { writes.add(f); return () => { writes.delete(f); }; }
function wrote() { for (const f of [...writes]) { try { f(); } catch {} } }
/** الحالة كما تُخزَّن وتُدفع إلى الخادم (C6: صفٌّ يقرؤه البوت كل مرة، لا يكبر بعد اثني عشر أسبوعًا). يُحتفظ بآخر ٤٠٠ يوم (كما v92)،
    وتُعاد بقية الحدود بالتنقية نفسها التي يمرّ بها ما يُقرأ. ثلاث طبقات:
    • أحدث أربعة عشر يومًا فيها فعل (أيام صور الأسبوع) وأيام الأسبوع الجاري: بتمامها، فما يُكتب منها يُقرأ كما هو (الإلغاء والتبديل والنتائج والبوت).
    • ما بقي من مدى «سجلّي» (keepFrom: الجهاز القديم يتراجع إلى ٤٢ يومًا، فلا بدّ من عكس أيامه): أثرٌ مضغوط لكل خطوة — ما قُرئ، ومدى صبغها
      وصورة ما تحته مقصوصةً على ذلك المدى (unpaintOn لا يقرأ غيره)، ونتيجتها — بلا ما لا يقرؤه إلا إلغاء ضغطة اليوم. فالتراجع إليها كما في الذاكرة.
    • ما قبله يُطوى: مدخل السجل بأوجهه وحدها، والخطوات تسقط إلا أثر قسطٍ لم يُختبر بعد آخر «نجحت» ويومَ ذلك النجاح (lostWeek)،
      ومسترجَع أسابيع الصور. فلا يُتراجع إليه (rewindable)، ولا يكبر الصفّ بعد امتلاء المدى إلا بمدخلٍ صغير لكل يوم.
    وتُحذف حقولٌ تُستعاد بعينها عند القراءة (guessOf، taken = ٠، مؤشّراتٌ كلّها فارغة، صور الأسبوع فروقًا) */
export function storedState(s0: State): Record<string, unknown> {
  const days = Object.keys(s0.log).sort().slice(-400);
  const keepLog: Record<string, LogEntry> = {};
  for (const d of days) keepLog[d] = s0.log[d];
  const s = sanitize(mk(s0.cur, keepLog, s0.steps?.slice(-STEP_CAP), s0.plan, s0.wk, s0.wkAt));
  const all = s.steps ?? [];
  const stepDays = [...new Set(all.map((q) => q.day))].sort();
  const keep = new Set([...stepDays.slice(-AT_CAP), ...Object.keys(s.wkAt ?? {})]);
  if (s.wk) for (const d of stepDays) if (d > s.wk.a) keep.add(d);
  const near = keepFrom(s);
  // أثر القسط يُبقى بعد آخر «نجحت» لا يلغيه تراجعٌ يقبله المخزن (قبل أول يومٍ يُحفظ أثره): نجاحٌ بعده قد يُلغى، فتعود أقساطه لم تُختبر (lostWeek)
  const floor = [...keep, near].sort()[0];
  let pass = "";
  for (const q of all) if (q.k === "new" && q.t === "w" && q.ok && q.day < floor && q.day > pass) pass = q.day;
  // ومسترجَعُ كل أسبوعٍ تعود إليه صورة (الحاضر وصور wkAt) أثرٌ يُبقى: التراجع إلى يومٍ له صورة يعيد أسبوعها، وما استُرجع فيه خارج
  // القديم الحديث حتى ينتهي وأمسُه منه (restoredIn، ydayOf)، وإلا دخل قبل وقته
  const wa = [s.wk, ...Object.values(s.wkAt ?? {})].reduce((m, w) => (w && w.a < m ? w.a : m), "9999-12-31");
  const steps: Record<string, unknown>[] = [], lastNext: Partial<Record<Track, number | null>> = {};
  let lastDay = "";
  for (const q of all) {
    const full = keep.has(q.day), rec = full || q.day >= near, back = q.k === "restore" && q.day > wa;
    // ويوم آخر «نجحت» قبل المدى يُبقى: منه يُعرف ما حفظه جهازٌ قديم بعده ولم يُختبر (lostWeek)، كما في الذاكرة
    const mark = q.k === "new" && !q.t && q.day > pass && q.spans.length > 0, last = q.k === "new" && q.t === "w" && !!q.ok && q.day === pass;
    if (!rec && !back && !mark && !last) continue;
    let o: Record<string, unknown>;
    if (full) o = { ...q };
    else if (rec) {
      // المتلاصق مدًى واحد (لا يقرأ ما قُرئ في يومٍ مضى إلا اشتقاقُ taken ومدَيات الأسبوع، وكلاهما يدمج)؛ ومسترجَعه كما هو: منه «مقدار أمس»
      o = { ...q, spans: q.k === "restore" ? q.spans : joined(q.spans) }; delete o.rcAdd; delete o.rcDel; delete o.t0;
      if (q.painted && q.ranges?.length) {
        const pc = clipPainted(q.painted, q.ranges), im = impliedPainted(q.k, q.t, q.ok, q.ranges);
        o.painted = im && JSON.stringify(im) === JSON.stringify(pc) ? 0 : pc;
      }
    } else {
      o = { day: q.day, k: q.k, spans: q.spans };
      if (back && q.ranges) o.ranges = q.ranges;
      if (last) { o.t = "w"; o.ok = true; }
    }
    const g = guessOf(lastNext, q.k, o.spans as Span[]);
    if (rec) { if (q.prev === g.prev) delete o.prev; if (q.next === g.next) delete o.next; if (q.pages === g.pages) delete o.pages; }
    lastNext[q.k] = rec ? q.next : g.next;
    // يوم الخطوة كيوم التي قبلها لا يُكتب (الخطوات بترتيبها، والقارئ يعيده منها)
    if (q.day === lastDay) delete o.day;
    lastDay = q.day;
    steps.push(o);
  }
  const ds = Object.keys(s.log).sort(), newest = ds[ds.length - 1];
  const log: Record<string, unknown> = {};
  for (const d of ds) {
    const e = s.log[d];
    const rec = keep.has(d) || d >= near;
    // قبل المدى لا يُتراجع إلى يومٍ (rewindable)، ولا يقرؤه شيءٌ إلا أوجهه (السلسلة والمجموع في «سجلّي»): فيُخزَّن بها وحدها، فلا يكبر
    // الصفّ بعد امتلاء المدى إلا بها. ومؤشّراتٌ كلّها فارغة (أعاد القارئ القديم كتابة يومٍ كهذا) تُقرأ فارغةً بلا مفتاحها.
    // والدمج لا يقيس المؤشّرات الفارغة (wirdSync resaved)، فلا يُعدّ الطيّ تبديلًا
    if (!rec && !e.steps) { const o: Record<string, unknown> = { ...e }; if (TRACKS.every((k) => e.prev[k] == null)) delete o.prev; log[d] = o; continue; }
    if (!e.steps) { log[d] = e; continue; }
    if (!rec) { log[d] = e.painted ? { total: e.total, painted: e.painted } : { total: e.total }; continue; }
    const o: Record<string, unknown> = { total: e.total, prev: e.prev };
    if (e.painted) o.painted = e.painted;
    // اليوم الأحدث يبقى بما قُرئ فيه (يعرضه القارئ القديم كما قُرئ)
    if (e.taken) o.taken = d !== newest && JSON.stringify(takenFrom(all.filter((q) => q.day === d))) === JSON.stringify(e.taken) ? 0 : e.taken;
    o.steps = true;
    log[d] = o;
  }
  const at = s.wkAt ?? {}, wkAt: Record<string, unknown> = {};
  let base: Week | null | undefined = s.wk;
  for (const d of Object.keys(at).sort().reverse()) {
    const w = at[d];
    if (!w || !base) wkAt[d] = w;
    else {
      const o: Record<string, unknown> = { "=": 1 }, gone: string[] = [];
      for (const f of WEEK_KEYS) {
        const a = (w as Record<string, unknown>)[f], b = (base as Record<string, unknown>)[f];
        if (JSON.stringify(a) === JSON.stringify(b)) continue;
        if (a === undefined) gone.push(f); else o[f] = a;
      }
      if (gone.length) o["-"] = gone;
      wkAt[d] = o;
    }
    base = w;
  }
  const out: Record<string, unknown> = { cur: s.cur, log };
  if (steps.length) out.steps = steps;
  if (s.plan) out.plan = s.plan;
  if (s.wk) out.wk = s.wk;
  if (Object.keys(wkAt).length) out.wkAt = wkAt;
  return out;
}
const WEEK_KEYS = ["v", "n", "a", "p", "r", "t", "z", "q", "k", "rc", "c"] as const;
/** صورة ما تحت صبغ الخطوة مقصوصةً على مدَياته: عكس الصبغ (unpaintOn) لا يقرأ منها إلا ما وقع في مدًى من مدَياتها، فالعكس بها هو العكس
    بالصورة كلّها، وهي أصغر بكثير (سورةٌ كلّها بأجزائها ← ما تحت أوجه اليوم وحدها، وكثيرًا ما يكون فراغًا) */
function clipPainted(painted: Painted[], ranges: PaintRange[]): Painted[] {
  const out: Painted[] = [];
  for (const snap of painted) {
    const rs = ranges.filter(([n]) => n === snap.surah);
    if (!rs.length) continue;
    const before: Band[] = [];
    for (const [, a, b] of rs) for (const [f, t, st] of snap.before) { const lo = Math.max(f, a), hi = Math.min(t, b); if (hi - lo > 1e-9) before.push([lo, hi, st]); }
    out.push({ surah: snap.surah, before });
  }
  return out;
}
/** تسجيل اليوم وكتابته: الواجهة تصبغ الجديد أولًا (paintMyRanges) ثم تمرّر paintedOf(السابق) */
export function logToday(w: Wird, painted: Painted[] = [], state: State = readState()): State {
  const s = applyLog(state, w, painted); writeState(s); return s;
}
/** التراجع عن يوم وكتابته؛ تُطبِّق الواجهة restore بـ setMyEntries إن لم تكن فارغة */
export function undoToday(day = dohaDate(), state: State = readState()): { state: State; restore: Entry[] } {
  const r = applyUndo(state, day); writeState(r.state); return r;
}
export const isLogged = (day = dohaDate(), state: State = readState()) => !!state.log[day];

/* ===== السلسلة والسجل: على سلاسل YYYY-MM-DD بتواريخ الدوحة حصرًا، بلا Date محلي ===== */
/** اليوم الذي قبله بـ k يومًا (حساب UTC على الأرقام وحدها) */
export function dayBefore(day: string, k = 1): string {
  return new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) - k * 864e5).toISOString().slice(0, 10);
}
/** أيام متتالية سُجّل فيها الورد، آخرها اليوم أو أمس */
export function streakOf(day = dohaDate(), log: Record<string, LogEntry> = readState().log): number {
  const has = (d: string) => !!log[d];
  if (!has(day) && !has(dayBefore(day))) return 0;
  let n = 0, k = has(day) ? 0 : 1;
  while (has(dayBefore(day, k))) { n++; k++; }
  return n;
}
/** لورقة «سجلّي»: السلسلة الحالية، وأطول سلسلة، ومجموع الصفحات المسجَّلة */
export function logStats(log: Record<string, LogEntry>, day = dohaDate()): { streak: number; longest: number; pages: number } {
  const days = Object.keys(log).filter(isYmd).sort();
  let longest = 0, run = 0, prev = "";
  for (const d of days) { run = prev && dayBefore(d) === prev ? run + 1 : 1; longest = Math.max(longest, run); prev = d; }
  return { streak: streakOf(day, log), longest, pages: days.reduce((s, d) => s + (log[d].total || 0), 0) };
}

/* ===== الإعدادات: على الجهاز (localStorage ww-wird-prefs) ===== */
const PKEY = "ww-wird-prefs";
/** تنقية الإعدادات — القاعدة الواحدة للمخزن ولما تمرّره الواجهة في الذاكرة: ما ليس عددًا منتهيًا (NaN/Infinity/غير عدد)
    يعود إلى الافتراضي؛ restore ≥ ٠؛ cycle ≥ ١؛ from صحيح ٠..١١٤؛ dir ±١ وإلا الافتراضي؛ recent صحيح ١..١٠٠.
    weekly من مفتاحه ما دام daily مرآته (أو غائبًا)؛ فإن خالفه daily (صفٌّ قديم، أو جهازٌ قديم حرّكه بعد كتابةٍ جديدة) غلب القديم:
    weekly = daily × ٥ إلى أقرب نصف. ثم daily يُكتب مرآةً دائمًا. فلا يتغيّر معنى إعدادٍ قديم بصمت.
    كانت readPrefs وحدها تنقّي، فإعداداتٌ في الذاكرة فيها NaN أفرغت المسارات بصمت؛ فتستدعيها كل دالّةٍ تقرأ الإعدادات */
export function normPrefs(src: unknown): Prefs {
  const o = (src && typeof src === "object" ? src : {}) as Partial<Record<keyof Prefs, unknown>>;
  const fin = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
  const n = (x: unknown, d: number, min: number) => (fin(x) ? Math.max(min, x) : d);
  const per = <T,>(src: unknown, d: Record<Track, T>, f: (x: unknown, dv: T) => T): Record<Track, T> => {
    const o2 = (src && typeof src === "object" ? src : {}) as Record<string, unknown>;
    return { new: f(o2.new, d.new), fix: f(o2.fix, d.fix), review: f(o2.review, d.review), restore: f(o2.restore, d.restore) };
  };
  const d = fin(o.daily) ? Math.max(0, o.daily) : undefined, w = fin(o.weekly) ? Math.max(0, o.weekly) : undefined;
  const raw = w !== undefined && (d === undefined || Math.abs(d - w / NEW_DAYS) <= 0.011) ? w : d !== undefined ? Math.round(d * 10) / 2 : DEFAULTS.weekly;
  const weekly = Math.min(60, raw);
  return {
    daily: Math.round((weekly / NEW_DAYS) * 100) / 100, restore: n(o.restore, DEFAULTS.restore, 0), cycle: n(o.cycle, DEFAULTS.cycle, 1),
    from: per(o.from, DEFAULTS.from, (x, dv) => Math.max(0, Math.min(114, Math.round(n(x, dv, 0))))),
    dir: per(o.dir, DEFAULTS.dir, (x, dv) => (x === -1 ? -1 : x === 1 ? 1 : dv)),
    weekly, recent: fin(o.recent) ? Math.min(100, Math.max(1, Math.round(o.recent))) : DEFAULTS.recent,
  };
}
export function readPrefs(): Prefs {
  try { return normPrefs(JSON.parse(localStorage.getItem(PKEY) || "{}")); } catch { return normPrefs({}); }
}
export function writePrefs(p: Prefs) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} wrote(); }

/* ===== الحاسبة: متى تختم حفظك؟ =====
   طلب صاحب المشروع 2026-11-08: عدّادٌ فوق الورقة يتغيّر مع كل تغييرٍ في الإعدادات. الحساب صريحٌ ولا يدّعي غيبًا:
     • الختم = أسابيعُ ما بقي بلا حفظ (من التحليل، بلا الفاتحة) على مقدار الأسبوع، × ٧ أيام.
     • الاسترجاع = ما نُسي ÷ مقداره اليومي.
   ولا تقدير لـ«متقن»: لا يأتي بمرور الوقت بل بالاختبارات. ومعدّلٌ صفر لا يعني «الآن» بل «لا تقدّم»: فتكون القيمة Infinity
   ويُرفع علم stalled، والواجهة تقول ذلك بصراحة. */
export type Forecast = {
  left: number;
  /** أيام حتى ختم الحفظ / حتى يُختم الاسترجاع — Infinity إن كان المقدار صفرًا وبقي شيء */
  toFinish: number; restoreAll: number;
  stalled: { new: boolean; restore: boolean };
};
export function forecast(map: HifzMapT, bands: BandsMapT | undefined, p: Prefs, an: Analysis = analyze(map, bands)): Forecast {
  const { weekly, restore } = normPrefs(p);
  const left = an.left;
  const weeks = left <= EPS ? 0 : weekly > 0 ? Math.ceil(left / weekly - 1e-9) : Infinity;
  const toFinish = Number.isFinite(weeks) ? weeks * 7 : Infinity;
  const restoreAll = an.pool.restore <= EPS ? 0 : restore > 0 ? Math.ceil(an.pool.restore / restore - 1e-9) : Infinity;
  return { left, toFinish, restoreAll, stalled: { new: !Number.isFinite(toFinish), restore: !Number.isFinite(restoreAll) } };
}
/** أيامٌ إلى سنواتٍ وشهورٍ وأيام (السنة ٣٦٥ والشهر ٣٠٫٤). غير المنتهي (Infinity) يُرجع أصفارًا: على الواجهة
    أن تقرأ forecast.stalled قبله وتقول «لا تقدّم على هذا المعدّل» بدل عرض الأصفار */
export function spanOf(days: number): { y: number; m: number; d: number } {
  if (!Number.isFinite(days)) return { y: 0, m: 0, d: 0 };
  const t = Math.max(0, Math.round(days));
  const y = Math.floor(t / 365), rest = t - y * 365;
  const m = Math.floor(rest / 30.4);
  return { y, m, d: Math.round(rest - m * 30.4) };
}
