/**
 * 全局类型定义 — 基于 PRD 的领域模型
 */

export type GoalCategory = 'habit' | 'ability' | 'state' | 'custom';

export interface CategoryMeta {
  key: GoalCategory;
  label: string;
  desc: string;
  color: 'brand' | 'mint' | 'lavender' | 'peach';
}

export type CheckinStatus =
  | 'done'      // 正常完成
  | 'late'      // 延迟打卡
  | 'missed'    // 未打卡
  | 'paused'    // 暂停（特殊场景）
  | 'pending';  // 今日待打卡

export interface CheckinRecord {
  date: string;            // YYYY-MM-DD
  status: CheckinStatus;
  duration: number;        // 实际完成的分钟数
  note?: string;
}

export interface DailyHabit {
  description: string;     // 每日具体事项
  duration: number;       // 单位：分钟
  /** @deprecated 产品已下线自动进阶，新目标固定为 false，仅兼容旧数据 */
  autoLevelUp: boolean;
  levelUpStep: number;      // 分钟（仅兼容旧自动进阶）
  /** 每周计划打卡天数（1–7），默认 7（每天） */
  daysPerWeek: number;
}

export interface PhaseTask {
  id: string;
  name: string;            // 阶段名称
  description: string;     // 阶段事项
  totalMinutes: number;    // 阶段总时长目标
  startDate: string;
  endDate: string;
  completed: boolean;
}

export interface RewardStage {
  id: string;
  name: string;
  content: string;         // 奖励内容
  triggerType: 'progress' | 'phase' | 'days';
  triggerValue: number;    // progress: 0-100；phase: 阶段索引(从1)；days: 连续天数
  status: 'locked' | 'available' | 'claimed';
  claimedAt?: string;
}

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  customCategoryName?: string;
  finalGoal: string;       // 最终目标
  coreNeed: string;        // 核心诉求 — 可选，习惯固化判定标准
  deadline: string;        // YYYY-MM-DD
  createdAt: string;
  totalDescription: string; // 总事项
  phases: PhaseTask[];
  dailyHabit: DailyHabit;
  checkins: Record<string, CheckinRecord>;
  rewards: RewardStage[];
  progress: number;         // 0-100
  manualDeduction: number;  // 累计手动扣除百分比（未打卡时由用户选择扣除）
  archived: boolean;        // 已结束/归档
  fixed: boolean;           // 习惯固化（进度100%）
  color: 'brand' | 'mint' | 'lavender' | 'peach';
  icon: string;
}

export type SpecialMode = 'shorten' | 'extend' | 'pause';

export interface SpecialScene {
  id: string;
  type: 'holiday' | 'travel' | 'sick' | 'other';
  label: string;
  startDate: string;
  endDate: string;
  mode: SpecialMode;
  shortenTo?: number;      // 缩短到的分钟数
  extendHours?: number;    // 延长延迟打卡的小时数
  active: boolean;
}

export interface ReviewReport {
  id: string;
  type: 'weekly' | 'monthly' | 'manual';
  title: string;
  date: string;            // YYYY-MM-DD
  goalId?: string;
  goalName?: string;
  content?: string;        // 手动复盘文本
  metrics?: {
    checkinRate: number;
    avgDuration: number;
    missedDays: number;
    progressDelta: number;
    totalMinutes: number;
  };
  suggestions?: string[];
  isFavorite?: boolean;
}

export interface UserProfile {
  /** 服务端用户 ID（远程模式登录 / 游客鉴权后由 /me 返回） */
  userId?: string;
  /** 是否为游客会话（账号登录后为 false） */
  isGuest?: boolean;
  nickname: string;
  avatar?: string;
  joinedAt: string;
  badges: string[];        // 身份标签
  totalCheckinDays: number;
  fixedHabitsCount: number;
}

export interface AppSettings {
  reminderTime: string;          // HH:mm
  reminderRepeat: number;        // 重复推送次数
  reviewReminderEnabled: boolean;
  reviewReminderTime: string;
  pushEnabled: boolean;
  theme: 'light' | 'dark';
  dataRetention: '1y' | '3y' | '5y' | 'forever';
  customEncouragements: string[];
  defaultProgressDeduction: number; // 0–10，未打卡扣进度默认比例
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  desc?: string;
  icon?: string;
  duration?: number;
}
