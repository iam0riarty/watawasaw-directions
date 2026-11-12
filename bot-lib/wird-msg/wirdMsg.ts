// نسخة مولَّدة بـ sync-lib.mjs من app/lib — لا تُعدَّل هنا؛ عدِّل المصدر في التطبيق ثم أعد التشغيل.
/* مُنسِّق رسائل البوت (SPEC البوت رسول §2): من يوم الورد (Day من dayOf) إلى HTML تلغرام. دوالّ صافية بلا DOM ولا شبكة ولا متغيّرات بيئة.

   لماذا هنا لا في البوت؟ لأن البوت رسولٌ يبلّغ ولا يحسب: المحرّك واحد (lib/wird.ts) والرسالة صورةٌ من ناتجه، فتُنسَّق
   بجوار المحرّك وتُختبَر معه بالخريطة نفسها، وتُنسَخ إلى دالّة الخادم (wird-msg) كما هي مع نُسخ wird/hifz/i18n.
   فلا يُستورَد هنا إلا "@/lib/wird" و"@/lib/hifz" و"@/lib/i18n" (تُستبدَل بـ "./X.ts" عند النسخ إلى Deno).

   الرسالة هي يوم الطريقة نفسه: الأقسام بترتيب SHOW (مراجعة القديم، مراجعة القريب، الحفظ الجديد، استعادة المنسيّ)، وكل صفٍّ «سورة · المدى
   بالكلمات · عدد مراته»، وسطر القيادة فوق مجموعته كما في الشاشة، ويوم الاختبار يُعلَن بمعياره. والبوت لا يسجّل شيئًا ولا يقول إن
   اختبارًا نجح: النتيجة ضغطةٌ في التطبيق وحده. rangeWords وtimesText تستعملهما الشاشة أيضًا، فلا يُقال الصفّ بلفظين.

   كل مفتاحٍ تطبعه الرسالة مكتوبٌ هنا حرفيًّا بين علامتَي تنصيصٍ مزدوجتين (LABEL وLEAD وNOTE وTIMES وما في الدوالّ): sync-lib.mjs
   يقصّ قاموس البوت إلى ما يجده كذلك (ومعه صيغة المؤنّث key+F)، فمفتاحٌ يُبنى وقت التشغيل يسقط من القاموس.

   نصوص البوت وحده عربيةٌ في هذا الملف لا في i18n: الرسائل للخادم وحده ولغة البوت عربية. و t() تعطي العربية افتراضيًا على الخادم
   بشرطٍ واحد: ألّا تُستدعى initLang() هناك قطّ — فهي تقرأ navigator.language، وDeno يعرّفه ("en-US" غالبًا) فتنقلب الرسالة
   إنجليزيةً بأرقامٍ لاتينية وأسماء سورٍ منقولة. دالّة الخادم تكتفي بالافتراضي، ولها أن تستدعي setLang("ar") مرةً احتياطًا
   (آمنة على Deno: وصولها إلى localStorage وdocument محروس). ونصوص المخاطَب بصيغتَيه [مذكّر، مؤنّث] كما tg في الواجهة،
   يختار بينهما الخادم بـ profiles.gender.

   HTML تلغرام لا يعرف إلا b وi وa وcode وblockquote، ولا يغفر < و> و& العارية: فكل نصٍّ متغيّر (مطلع الآية من ملفٍ خارجي،
   وأسماء السور والمفاتيح احتياطًا) يمرّ بـ esc. والأرقام عربية هندية بـ num كما في الواجهة، ولا إيموجي.

   حدّ sendMessage في تلغرام ٤٠٩٦ حرفًا بعد تحليل الكيانات (النصّ الظاهر بلا وسومٍ ولا href). نصيب مراجعةٍ يمرّ بقصار السور
   يُخرج عشرات الصفوف، فتنزل الرسالة درجاتٍ: بلا مطالع أوّلًا، ثم تدخل الصفوف بترتيب الأقسام ما اتّسعت مع سطرٍ يُحيل باقيها إلى
   التطبيق، والرأس وسطر القاعدة وعناوين الأقسام والذيل باقيةٌ دائمًا. فرسالةٌ ناقصة خيرٌ من 400 من تلغرام ولا رسالةَ ذاك الصباح.

   رابط ترتيل على أوّل آية في المقطع فقط: لا صيغةَ لمدى آياتٍ في روابطهم (ملف AASA يعلن ayah/*)، فيفتح التطبيق على الآية
   ويقرأ صاحبه إلى آخر المقطع المكتوب في السطر. */
import { pagesAmount, surahName } from "./hifz.ts";
import { daysGen, num, plural, t, tg, type Key } from "./i18n.ts";
import { SHOW, type Day, type DayPart, type Role, type Seg, type Times, type Track } from "./wird.ts";

/** رابط ترتيل: يفتح تطبيق ترتيل (أو موقعه) على الآية */
export const tarteelUrl = (surah: number, aya: number) => `https://tarteel.ai/ayah/${surah}/${aya}`;

/** هروب HTML تلغرام: الثلاثة التي يرفضها عاريةً خارج الوسوم */
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** حدّ sendMessage: ٤٠٩٦ حرفًا بعد تحليل الكيانات. يُصدَّر ليسجّل الخادم حين تنزل الرسالة درجة */
export const TG_MAX = 4096;
/** طول الرسالة كما يعدّه تلغرام: بلا وسوم، والكيان المهروب (&amp; و&lt; و&gt;) حرفٌ واحد */
export const tgLen = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&(?:amp|lt|gt);/g, "x").length;

/** مزوّد مطلع الآية: نصّها (أو undefined إن لم يتوفّر) — الخادم يملكه بذاكرته، والمُنسِّق لا يجلب شيئًا */
export type Opening = (surah: number, aya: number) => string | undefined;

/** أسماء الأقسام من مفاتيح الواجهة نفسها (components/wird/common.tsx لا يُستورَد: ملف React) */
const LABEL: Record<Track, Key> = { new: "wrNew", fix: "wrFix", review: "wrReview", restore: "wrRestore" };
/** سطر القيادة فوق مجموعة الصفوف بدورها، كما PartRows في الشاشة. نصيب المراجعة والقديم الحديث واسترجاع اليوم بلا قيادة.
    والقسط في أسبوعٍ معاد "wrLeadTodayRe" (في leadOf) */
const LEAD: Partial<Record<Role, Key>> = {
  prev1: "wrLeadPrev1", prevN: "wrLeadPrevN", noPortion: "wrLeadNoPortion", portion: "wrLeadToday",
  week: "wrLeadWeek", test: "wrLeadTest", yday: "wrLeadYest", exit: "wrLeadExit",
};
/** معيار النجاح تحت صفّ الاختبار، ليعرف صاحبه ما يُحسب له قبل أن يسجّل نتيجته في التطبيق */
const NOTE: Partial<Record<Role, Key>> = { test: "wrTestNote", exit: "wrExitNote" };
/** عدد مرات الصفّ (Times). صفّ الاختبار يُسمَّع مرةً غيبًا «مرة، اختبار»، فلكل صفٍّ عدده */
const TIMES: Record<Times, Key> = { 0: "wrXTest", 1: "wrX1", 2: "wrX2", 3: "wrX3" };
/** الكمية بمعدودها كما في الشاشة («١٫٨ وجه»، والاثنان «وجهان» وحده) */
const pages = (n: number) => pagesAmount(n);
/** كلمات مطلع الآية المعروضة تحت السطر: كما في صفّ المقطع في التطبيق (SegRow) */
const HEAD_WORDS = 7;

/** نصوص المخاطَب [مذكّر، مؤنّث]: محليًّا لا في i18n لأن الرسائل للخادم وحده. البوت يرسل ويذكّر ولا يسجّل، فكل دعوةٍ إلى
    التسجيل تُحيل إلى التطبيق */
const S = {
  tail: ["اضغط سطرًا يفتح ترتيل على أول آية فيه، والتسجيل في التطبيق.", "اضغطي سطرًا يفتح ترتيل على أول آية فيه، والتسجيل في التطبيق."],
  testTail: ["وسجّل نتيجة الاختبار في التطبيق.", "وسجّلي نتيجة الاختبار في التطبيق."],
  tailLogged: ["سُجّل ورد اليوم. اضغط سطرًا يفتح ترتيل على أول آية فيه.", "سُجّل ورد اليوم. اضغطي سطرًا يفتح ترتيل على أول آية فيه."],
  none: ["لا شيء في وردك اليوم: خريطتك فارغة أو مقاديرك صفر. راجع إعدادات الورد في التطبيق.", "لا شيء في وردكِ اليوم: خريطتكِ فارغة أو مقاديركِ صفر. راجعي إعدادات الورد في التطبيق."],
  answered: ["نتيجة اختبار الأسبوع مسجَّلة في التطبيق، ولا شيء غيرها في وردك اليوم.", "نتيجة اختبار الأسبوع مسجَّلة في التطبيق، ولا شيء غيرها في وردكِ اليوم."],
  eveTitle: ["لم تسجّل ورد اليوم بعد", "لم تسجّلي ورد اليوم بعد"],
  eveBody: ["وردك اليوم {n}. إن كنت سمّعته فسجّله في التطبيق، وإلا بقي كما هو إلى الغد. وإن ضاق يومك فاكتفِ بمراجعة القديم ومراجعة القريب.", "وردكِ اليوم {n}. إن كنتِ سمّعتِه فسجّليه في التطبيق، وإلا بقي كما هو إلى الغد. وإن ضاق يومكِ فاكتفي بمراجعة القديم ومراجعة القريب."],
  nsTitle: ["لم يصل وردك إلى البوت بعد", "لم يصل وردكِ إلى البوت بعد"],
  nsBody: ["افتح وتواصوا مرةً ليتزامن وردك مع البوت، ثم يصلك هنا كل صباح.", "افتحي وتواصوا مرةً ليتزامن وردكِ مع البوت، ثم يصلكِ هنا كل صباح."],
  btn: ["سجّل في وتواصوا", "سجّلي في وتواصوا"],
} satisfies Record<string, [string, string]>;
const say = (k: keyof typeof S, women: boolean) => S[k][women ? 1 : 0];

/** المدى بالكلمات: «من آية ٤٦ إلى آية ٦٩»، أو «آية ٢» لمقطع الآية الواحدة. لا رقمان بينهما شرطة، فلا يُقرأ المدى طرحًا ولا
    تاريخًا. بلا اسم السورة وبلا هروب: الشاشة تضعه بعد الاسم، والرسالة تهرب السطر كلّه */
export const rangeWords = (g: Pick<Seg, "from" | "to">) =>
  g.from === g.to ? t("wrAya").replace("{a}", num(g.from)) : t("wrFromTo").replace("{a}", num(g.from)).replace("{b}", num(g.to));
/** كم مرة يُسمَّع الصفّ: «مرة» · «مرتين» · «ثلاث مرات» · «مرة، اختبار» */
export const timesText = (x: Times) => t(TIMES[x]);

/** سطر ما قُصّ من قسم: «…و١٢ مقطعًا آخر في التطبيق» — بلا فعلٍ كي لا تتعثّر المطابقة بين المفرد والجمع */
const more = (n: number) => `…و${plural(n, "مقطع آخر", "مقطعان آخران", "مقاطع أخرى", "مقطعًا آخر", ["more segment", "more segments"])} في التطبيق`;

/** قيادة مجموعة الصفوف، أو null لما لا قيادة له */
function leadOf(role: Role, repeat: boolean, women: boolean): string | null {
  if (role === "portion" && repeat) return tg("wrLeadTodayRe", women);
  const k = LEAD[role];
  return k ? tg(k, women) : null;
}

/** الرأس: موضع اليوم من أسبوع الحفظ (أو من الأسبوع المعاد)؛ وبلا جديدٍ هذا الأسبوع يوم دورة المراجعة؛ وإلا العنوان وحده */
function header(d: Day): string {
  const h = `<b>${esc(t("wrTitle"))}</b>`;
  if (d.week) return `${h} · ${esc(t(d.week.repeat ? "wrWeekLineRe" : "wrWeekLine").replace("{d}", num(d.week.pos)))}`;
  // «من دورة {n}» مضافٌ إليه: «من دورة يومين» لا «من دورة ٢ يومان»
  if (d.cycle) return `${h} · ${esc(t("wrCycleLine").replace("{d}", num(d.cycle.day)).replace("{n}", daysGen(d.cycle.days)))}`;
  return h;
}

/** الأقسام التي تُطبع، بترتيب الطريقة: ما ينتظر الغد في اليوم الضيّق خارجها، وما لا صفوف له، واختبار الأسبوع الذي سُجّلت نتيجته
    في يومٍ قبله (answered): ليس مما يُطلب اليوم (need) ونتيجته مقفلة في التطبيق، فإعلانه ثانيةً دعوةٌ إلى اختبارٍ انتهى */
const shown = (d: Day): DayPart[] =>
  SHOW.map((k) => d.parts.find((x) => x.k === k)).filter((x): x is DayPart => !!x && !x.waits && !x.answered && x.rows.some((r) => r.segs.length > 0));

/** اختبارٌ معروض لم تُسجَّل نتيجته بعد (الأسبوع في يومه السابع، أو الخروج): فيُذكَّر بتسجيلها في التطبيق */
const testPending = (d: Day) => !d.logged && shown(d).some((x) =>
  (x.k === "new" && x.ask?.kind === "w" && x.ask.ok === undefined && !x.answered) || (!!x.exit && x.exit.ok === undefined));

/** سطر المقطع: رابط ترتيل على أوّل آية فيه، ثم عدد مراته؛ وتحته مطلع الآية إن توفّر.
    المطلع يُقَصّ هنا إلى HEAD_WORDS كلمة مهما أعاد المُزوِّد (نصّ الآية كاملًا عادةً)، ويُختَم بـ«…» إن قُصّ — فالمقتبس بين ﴿﴾
    قرآن، وبترُه بلا علامة يُقرأ آيةً تامّة */
function segLine(g: Seg, times: Times, opening?: Opening): string {
  let line = `• <a href="${tarteelUrl(g.surah, g.from)}">${esc(`${surahName(g.surah)} ${rangeWords(g)}`)}</a>، ${esc(timesText(times))}`;
  const head = opening?.(g.surah, g.from)?.trim();
  if (head) {
    const words = head.split(/\s+/);
    const cut = words.slice(0, HEAD_WORDS).join(" ") + (words.length > HEAD_WORDS ? "…" : "");
    line += `\n<i>﴿${esc(cut)}﴾</i>`;
  }
  return line;
}

/** صفوف القسم وحداتٍ للقصّ، وحدةٌ لكل مقطع: يسبق أوّلَ مقاطع المجموعة سطرُ قيادتها، ويلي آخرَها معيارُ الاختبار إن كان.
    فيُقَصّ المقطع مع قيادته ومعياره، ولا تبقى قيادةٌ بلا صفّ */
function itemsOf(x: DayPart, repeat: boolean, women: boolean, opening?: Opening): string[] {
  const rows = x.rows.filter((r) => r.segs.length > 0), out: string[] = [];
  rows.forEach((r, i) => {
    const first = i === 0 || rows[i - 1].role !== r.role, last = i === rows.length - 1 || rows[i + 1].role !== r.role;
    const lead = first ? leadOf(r.role, repeat, women) : null, note = last ? NOTE[r.role] : undefined;
    r.segs.forEach((g, j) => {
      const lines: string[] = [];
      if (lead && j === 0) lines.push(`${esc(lead)}:`);
      lines.push(segLine(g, r.times, opening));
      if (note && j === r.segs.length - 1) lines.push(esc(t(note)));
      out.push(lines.join("\n"));
    });
  });
  return out;
}

/** تركيب رسالة الصباح في حدّ max حرفًا (بعدّ تلغرام): الرأس وسطر القاعدة وعناوين الأقسام والذيل تبقى مهما قُصّ، والمقاطع تدخل
    بترتيب الأقسام ما اتّسع لها. سطر «…وكذا مقاطع أخرى» محجوزٌ من البدء لكل قسم بعدد مقاطعه كلّها، ثم يُستبدَل بما يبقى بعد كل
    مقطعٍ يدخل: فلا يُدخَل سطرٌ يحرم الباقيَ من ذِكرِه، ولا يأكل قسمٌ مكانَ سطر الإحالة في قسمٍ بعده. max = Infinity يعطي الرسالة كاملةً */
function compose(d: Day, opening: Opening | undefined, women: boolean, max: number): string {
  const parts = shown(d);
  // لم يبقَ إلا اختبارٌ سُجّلت نتيجته (ما كان معه أُطفئ، كاسترجاعٍ صار مقداره صفرًا): يُقال ذلك، لا إن الخريطة فارغة. ولا يُقال ما النتيجة
  if (!parts.length && d.parts.some((x) => x.answered)) return [header(d), "", say("answered", women)].join("\n");
  if (!parts.length) return [`<b>${esc(t("wrTitle"))}</b>`, "", say("none", women)].join("\n");
  const out: string[] = [header(d), `<i>${esc(tg("wrRule1", women))}</i>`];
  const tail = ["", say(d.logged ? "tailLogged" : "tail", women)];
  if (testPending(d)) tail.push(say("testTail", women));
  const repeat = !!d.week?.repeat;
  const title = (x: DayPart) => `<b>${esc(t(LABEL[x.k]))}</b> · ${esc(pages(x.pages))}`;
  const cost = (s: string) => tgLen(s) + 1; // الحرف الزائد لفاصل السطر
  const items = parts.map((x) => itemsOf(x, repeat, women, opening));
  let used = [...out, ...tail].reduce((s, l) => s + cost(l), 0)
    + parts.reduce((s, x, i) => s + cost("") + cost(title(x)) + cost(more(items[i].length)), 0);
  parts.forEach((x, i) => {
    const xs = items[i];
    out.push("", title(x));
    let held = cost(more(xs.length)); // المحجوز لهذا القسم إن لم يدخل منه مقطعٌ واحد
    for (let j = 0; j < xs.length; j++) {
      const next = j + 1 < xs.length ? cost(more(xs.length - j - 1)) : 0;
      if (used - held + cost(xs[j]) + next > max) { out.push(more(xs.length - j)); break; }
      out.push(xs[j]);
      used += cost(xs[j]) + next - held; held = next;
    }
  });
  out.push(...tail);
  return out.join("\n");
}

/** رسالة الصباح: الرأس بموضع اليوم من الأسبوع، وسطر القاعدة الأولى، ثم لكل قسمٍ عنوانُه بمقداره وصفوفه بقياداتها وعدد مرات كل
    صفّ، ثم ذيلٌ يشرح الرابط ويحيل التسجيل إلى التطبيق (ومعه تذكير نتيجة الاختبار إن عُرض اختبارٌ لم تُسجَّل نتيجته).
    اليوم المسجَّل يُعرَض كما قُرئ (dayOf يُرجع خطواته) ويُقال إنه سُجّل بدل دعوته إلى التسجيل.
    ولا قسم يُطبع (مقادير صفر أو خريطة فارغة) ⇒ جملةٌ تحيله إلى الإعدادات بدل رأسٍ بلا جسد.
    الطول في حدّ max (TG_MAX افتراضيًا؛ الاختبارات تضيّقه): أوّل ما يُضحّى به المطالع فهي زينةٌ والروابط هي الورد،
    فإن لم تكفِ قُصّت الصفوف (compose) */
export function morningMessage(d: Day, opening?: Opening, women = false, max = TG_MAX): string {
  const full = compose(d, opening, women, Infinity);
  if (tgLen(full) <= max) return full;
  if (opening) {
    const bare = compose(d, undefined, women, Infinity);
    if (tgLen(bare) <= max) return bare;
  }
  return compose(d, undefined, women, max);
}

/** رسالة المساء لمن لم يسجّل: مقدار اليوم، وأن التسجيل في التطبيق، وأن الورد يبقى كما هو إن لم يُسمَّع، ورخصة اليوم الضيّق */
export function eveningMessage(d: Day, women = false): string {
  return [`<b>${say("eveTitle", women)}</b>`, say("eveBody", women).replace("{n}", esc(pages(d.total)))].join("\n");
}

/** لمن لا صفّ له في wird_state: التطبيق هو الذي يرفع الورد إلى الخادم عند فتحه، والبوت لا يحسب */
export function notSyncedMessage(women = false): string {
  return [`<b>${say("nsTitle", women)}</b>`, say("nsBody", women)].join("\n");
}

/** لوحة الزر الواحد: يفتح ورد اليوم في التطبيق (?tab=me تتولّاها الصفحة، و?open=wird تفتحها WirdMap).
    الصيغة «…/app/?tab=me&open=wird» بالشرطة قبل علامة الاستفهام: التطبيق تصديرٌ ساكن بـ trailingSlash فصفحته على «/app/»،
    وبلا الشرطة يردّ GitHub Pages بتحويل 301 زائد؛ وهي صيغة بوت قرآني نفسها فلا يصير للزر شكلان. الشرطات الزائدة في آخر
    app_url تُطوى إلى واحدة، ومعاملٌ قائم يُلحَق بـ& لا بعلامة استفهامٍ ثانية.
    app_url فارغ (إعدادٌ ناقص) ⇒ لوحة بلا أزرار: تلغرام يرفض رابط زرٍّ بلا مضيف ويُسقط الرسالة كلّها معه */
export function appKeyboard(appUrl: string, women = false): { inline_keyboard: { text: string; url: string }[][] } {
  const base = appUrl.trim().replace(/\/+$/, "");
  if (!base) return { inline_keyboard: [] };
  const url = base.includes("?") ? `${base}&tab=me&open=wird` : `${base}/?tab=me&open=wird`;
  return { inline_keyboard: [[{ text: say("btn", women), url }]] };
}
