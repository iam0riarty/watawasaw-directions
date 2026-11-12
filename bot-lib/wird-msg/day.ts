// نسخة مولَّدة بـ sync-lib.mjs من app/lib — لا تُعدَّل هنا؛ عدِّل المصدر في التطبيق ثم أعد التشغيل.
import { sunAt } from "./sun.ts";

/* يوم الدفعة الحقيقي: يبدأ من فجر الدوحة لا من منتصف الليل، فمن يقرأ بعد منتصف الليل قبل الفجر يُحسب له اليوم نفسه */
const TZ = "Asia/Qatar";

/** ساعة الفجر (عشرية) ليوم معيّن: أول لحظة تتجاوز فيها الشمس ١٨° تحت الأفق صعودًا */
export function fajrHour(date = new Date()) {
  let lo = 2, hi = 7;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (sunAt(mid, date).alt < -18) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/** تاريخ الدوحة (YYYY-MM-DD) للحظة ما، بعد إزاحة الفجر */
export function dohaDate(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "0";
  const hour = +g("hour") + +g("minute") / 60;
  const ymd = `${g("year")}-${g("month")}-${g("day")}`;
  if (hour >= fajrHour(d)) return ymd;
  const prev = new Date(Date.UTC(+g("year"), +g("month") - 1, +g("day")) - 864e5);
  return prev.toISOString().slice(0, 10);
}

/** رقم اليوم في الدفعة (١..٣٠) من تاريخ بدئها؛ أقل من ١ قبل البدء، وأكثر من ٣٠ بعد الحصاد */
export function cohortDay(start: string, now = new Date()) {
  const a = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10));
  const t = dohaDate(now); const b = Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
  return Math.round((b - a) / 864e5) + 1;
}

/** تاريخ «يوم الحلقة» كما يحسبه الخادم (cohort_day): يوم الدوحة بعد إزاحةٍ ثابتة أربع ساعات، لا بعد الفجر المحسوب.
    يختلف عن dohaDate دقائقَ كل ليلة (بين الرابعة والفجر شتاءً، وبين الفجر والرابعة صيفًا)؛ ومن يطابق يومًا محليًّا بيوم الحلقة يقارن بهذا (lib/hifzLink.ts) */
export function circleDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now.getTime() - 4 * 36e5));
}
