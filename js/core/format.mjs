// 时间与数值的展示格式。所有时间按地点时区显示，时区无效时退回设备时区。

export function localTimeZone(bundle) {
  const timeZone = bundle?.forecasts?.local?.timezone;
  if (typeof timeZone !== "string" || !timeZone) return undefined;
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone }).format(0);
    return timeZone;
  } catch {
    return undefined;
  }
}

export function formatClock(date, timeZone) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(date);
}

export function formatEventDate(date, timeZone) {
  const formatted = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone
  }).format(date);
  return formatted.replace(/(?=周)/, " · ");
}

export function formatUpdated(timestamp, timeZone) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone
  }).format(new Date(timestamp));
}

export function formatAge(milliseconds) {
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  return minutes < 60 ? `${minutes} 分钟前` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟前`;
}

// 倒计时以观赏窗口为准：开始前倒数，窗口内提示进行中
export function formatCountdown(viewing, now = Date.now()) {
  if (now > viewing.end.getTime()) return "本场已结束";
  if (now >= viewing.start.getTime()) return "观赏窗口进行中";
  const totalMinutes = Math.max(1, Math.floor((viewing.start.getTime() - now) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return hours ? `${days} 天 ${hours} 小时后开始` : `${days} 天后开始`;
  if (hours) return minutes ? `${hours} 小时 ${minutes} 分钟后开始` : `${hours} 小时后开始`;
  return `${minutes} 分钟后开始`;
}

export function formatDelta(delta) {
  const rounded = Math.round(delta);
  if (rounded === 0) return "±0";
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
}

export const eventLabels = {
  glow: { sunset: "晚霞", sunrise: "朝霞" },
  sundisc: { sunset: "落日", sunrise: "日出" },
  sun: { sunset: "日落", sunrise: "日出" }
};
