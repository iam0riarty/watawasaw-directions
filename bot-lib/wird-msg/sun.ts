// نسخة مولَّدة بـ sync-lib.mjs من app/lib — لا تُعدَّل هنا؛ عدِّل المصدر في التطبيق ثم أعد التشغيل.
/* موضع الشمس فوق الدوحة (تقريب فلكي كافٍ للعرض): الارتفاع بالدرجات، وزاوية الساعة، وهل نحن قبل الظهر أم بعده */
const LAT = 25.29, LON = 51.53, TZ = 3;
const rad = Math.PI / 180;

/** الساعة الحالية بتوقيت الدوحة (عشرية، ٠..٢٤) */
export function dohaHour(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Qatar", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d);
  const h = +(p.find((x) => x.type === "hour")?.value ?? 0), m = +(p.find((x) => x.type === "minute")?.value ?? 0);
  return h + m / 60;
}

export type Sun = { alt: number; ha: number; pm: boolean };
export function sunAt(hour: number, date = new Date()): Sun {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0), n = Math.floor((date.getTime() - start) / 864e5);
  const g = (2 * Math.PI / 365) * (n - 1 + (hour - 12) / 24);
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const solarMin = hour * 60 + eot + 4 * LON - 60 * TZ;
  const ha = solarMin / 4 - 180;
  const alt = Math.asin(Math.sin(LAT * rad) * Math.sin(decl) + Math.cos(LAT * rad) * Math.cos(decl) * Math.cos(ha * rad)) / rad;
  return { alt, ha, pm: ha > 0 };
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;

/* ألوان السماء (أعلى، وسط، أفق) حسب ارتفاع الشمس، صباحًا ومساءً */
const AM: Array<[number, string, string, string]> = [
  [-18, "#050914", "#0b1430", "#16213f"],
  [-12, "#070d22", "#18204c", "#33305a"],
  [-5, "#1c2b5c", "#57497c", "#d68a6c"],
  [1, "#3a62a6", "#93aed2", "#ffbf86"],
  [8, "#3f7fd0", "#86b7ea", "#dcedff"],
  [40, "#2c70d4", "#6aaef0", "#cfe8ff"],
];
const PM: Array<[number, string, string, string]> = [
  [-18, "#050914", "#0b1430", "#16213f"],
  [-11, "#0a1030", "#2a2458", "#4a3060"],
  [-4, "#232a62", "#6b3f78", "#e0745a"],
  [1, "#3b4f8f", "#c87a86", "#ff9a52"],
  [10, "#3a78c8", "#9cbde2", "#ffdca6"],
  [40, "#2c70d4", "#6aaef0", "#cfe8ff"],
];

export function skyLook(s: Sun) {
  const T = s.pm ? PM : AM; const a = Math.max(T[0][0], Math.min(T[T.length - 1][0], s.alt));
  let i = 0; while (i < T.length - 2 && a > T[i + 1][0]) i++;
  const t = (a - T[i][0]) / (T[i + 1][0] - T[i][0]);
  const [top, mid, hor] = [1, 2, 3].map((k) => css(mix(hex(T[i][k] as string), hex(T[i + 1][k] as string), t)));
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {
    top, mid, hor,
    night: clamp((-s.alt - 4) / 8),              // النجوم والهلال
    day: clamp((s.alt + 2) / 14),                 // ضوء النهار على الشجرة
    golden: clamp(1 - Math.abs(s.alt - 4) / 10) * (s.alt > -4 ? 1 : 0), // شروق/أصيل/غروب
    birds: s.alt > -3 && s.alt < 22,
  };
}
