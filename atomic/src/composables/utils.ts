/**
 * 通用工具函数
 */

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(d: Date | string, fmt: 'YMD' | 'MD' | 'WEEKDAY' | 'CN' = 'YMD'): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (fmt === 'YMD') return `${y}-${m}-${day}`;
  if (fmt === 'MD') return `${m}.${day}`;
  if (fmt === 'CN') return `${y}年${parseInt(m)}月${parseInt(day)}日`;
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[date.getDay()];
}

export function todayStr(): string {
  return formatDate(new Date(), 'YMD');
}

/**
 * 把任意 Date 转换为本地 YYYY-MM-DD 字符串。
 * 注意：不要使用 d.toISOString().slice(0,10)，那是 UTC 时间，
 * 在中国时区凌晨 0-8 点会得到上一天，导致打卡日期错位。
 */
export function dateKey(d: Date): string {
  return formatDate(d, 'YMD');
}

/** 解析 YYYY-MM-DD 为本地零点 Date，避免 new Date('2026-04-25') 被解析成 UTC */
function parseDateLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function diffDays(from: string, to: string): number {
  const a = parseDateLocal(from).getTime();
  const b = parseDateLocal(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function addDays(d: string, n: number): string {
  const date = parseDateLocal(d);
  date.setDate(date.getDate() + n);
  return formatDate(date);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}小时` : `${h}小时${m}分钟`;
}

export function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** 鼓励语库 */
export const encouragements = {
  daily: [
    '太棒啦！今日打卡圆满完成，微小的坚持终会有大改变',
    '日复一日的累积，正在塑造一个全新的你',
    '又一个稳稳的「今天」，你正在变成想成为的人',
    '完成胜过完美，继续保持这份节奏',
    '坚持就像复利，每一次都在为未来积蓄能量',
  ],
  progress: [
    '进度已突破 30%，习惯固化就在眼前',
    '过半啦！你正走在属于你的轨道上',
    '看得见的进步，看不见的蜕变',
    '稳健向前，习惯掌控者称号正在向你靠近',
  ],
  reward: [
    '恭喜达成奖励条件！好好享受属于你的奖励',
    '你应得的奖励已就位，请收下这份礼物',
    '每一次奖励，都是对坚持最好的回应',
  ],
  low: [
    '偶尔偷懒没关系，重新开始即可，哪怕只完成 1 分钟也是进步',
    '今日未完成打卡，调整状态，明天重新出发就好',
    '低谷是上扬的起点，你的努力 APP 都看在眼里',
    '不指责，不苛求，重启即胜利',
  ],
};

/** 默认目标分类预设 */
export const categoryPresets = [
  { key: 'habit', label: '习惯固化', desc: '把行为内化为本能，如早起、阅读', color: 'brand' },
  { key: 'ability', label: '能力提升', desc: '掌握新技能，如学习语言、编程', color: 'mint' },
  { key: 'state', label: '状态改善', desc: '改善身心状态，如健身、冥想', color: 'lavender' },
  { key: 'custom', label: '自定义', desc: '创建属于你的目标分类', color: 'peach' },
] as const;

/** 颜色调色板（用于目标卡片） */
export const goalColors = ['brand', 'mint', 'lavender', 'peach'] as const;

/** 图标候选 */
export const goalIcons = [
  '🎯', '📚', '💪', '🧘', '🌅', '✍️', '🎨', '🎵', '🌱', '⚡', '🔥', '💎',
];
