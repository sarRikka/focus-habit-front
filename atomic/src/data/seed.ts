import type { Goal, ReviewReport, SpecialScene, UserProfile, AppSettings } from '../types';
import { addDays, dateKey, todayStr, uid } from '../composables/utils';

/**
 * 初始化 Mock 数据 — 提供 3 个示例目标，便于直观感受 APP 体验
 */

function buildCheckins(days: number, missCount = 1, lateCount = 1): Goal['checkins'] {
  const map: Goal['checkins'] = {};
  const today = new Date();
  let missLeft = missCount;
  let lateLeft = lateCount;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = dateKey(d);
    if (i === 0) continue;
    let status: 'done' | 'late' | 'missed' = 'done';
    if (missLeft > 0 && Math.random() < 0.12) {
      status = 'missed';
      missLeft--;
    } else if (lateLeft > 0 && Math.random() < 0.15) {
      status = 'late';
      lateLeft--;
    }
    map[ds] = {
      date: ds,
      status,
      duration: status === 'missed' ? 0 : 8 + Math.floor(Math.random() * 6),
    };
  }
  return map;
}

export function seedGoals(): Goal[] {
  const now = todayStr();
  return [
    {
      id: uid('g'),
      name: '3 个月掌握 Python',
      category: 'ability',
      finalGoal: '能独立编写简单小程序',
      coreNeed: '完成基础语法、函数、数据结构的学习',
      deadline: addDays(now, 60),
      createdAt: addDays(now, -30),
      totalDescription: '系统性学习 Python，覆盖基础语法到数据结构与函数应用',
      phases: [
        {
          id: uid('p'),
          name: '第 1 月',
          description: '掌握 Python 基础语法（变量、数据类型、运算符）',
          totalMinutes: 300,
          startDate: addDays(now, -30),
          endDate: addDays(now, 0),
          completed: true,
        },
        {
          id: uid('p'),
          name: '第 2 月',
          description: '掌握函数、列表、字典等基础数据结构',
          totalMinutes: 450,
          startDate: addDays(now, 0),
          endDate: addDays(now, 30),
          completed: false,
        },
        {
          id: uid('p'),
          name: '第 3 月',
          description: '练习简单小程序编写，巩固知识点',
          totalMinutes: 600,
          startDate: addDays(now, 30),
          endDate: addDays(now, 60),
          completed: false,
        },
      ],
      dailyHabit: {
        description: '每天晚上 7 点，学习 Python 基础语法 10 分钟，完成 1 道练习题',
        duration: 10,
        autoLevelUp: true,
        levelUpStep: 2,
      },
      checkins: buildCheckins(30, 2, 2),
      rewards: [
        { id: uid('r'), name: '第 1 阶段奖励', content: '一杯精品手冲咖啡', triggerType: 'phase', triggerValue: 1, status: 'claimed', claimedAt: addDays(now, -1) },
        { id: uid('r'), name: '半程奖励', content: '一本想读已久的书', triggerType: 'progress', triggerValue: 50, status: 'available' },
        { id: uid('r'), name: '冲刺奖励', content: '一台机械键盘', triggerType: 'progress', triggerValue: 100, status: 'locked' },
      ],
      progress: 36,
      manualDeduction: 0,
      archived: false,
      fixed: false,
      color: 'brand',
      icon: '📚',
    },
    {
      id: uid('g'),
      name: '每日早起 6:30',
      category: 'habit',
      finalGoal: '养成自然早起的生物钟',
      coreNeed: '连续 60 天 6:30 前自然起床，无需闹钟',
      deadline: addDays(now, 45),
      createdAt: addDays(now, -15),
      totalDescription: '通过逐步提前的睡眠/起床节律，固化早起习惯',
      phases: [
        {
          id: uid('p'),
          name: '适应期',
          description: '6:50 起床，建立稳定起床动作',
          totalMinutes: 0,
          startDate: addDays(now, -15),
          endDate: addDays(now, 0),
          completed: true,
        },
        {
          id: uid('p'),
          name: '巩固期',
          description: '6:40 起床，搭配晨间小动作',
          totalMinutes: 0,
          startDate: addDays(now, 0),
          endDate: addDays(now, 20),
          completed: false,
        },
        {
          id: uid('p'),
          name: '固化期',
          description: '6:30 起床，自然唤醒',
          totalMinutes: 0,
          startDate: addDays(now, 20),
          endDate: addDays(now, 45),
          completed: false,
        },
      ],
      dailyHabit: {
        description: '6:40 前起床，开窗呼吸 3 分钟，喝一杯温水',
        duration: 5,
        autoLevelUp: false,
        levelUpStep: 1,
      },
      checkins: buildCheckins(15, 1, 1),
      rewards: [
        { id: uid('r'), name: '小确幸', content: '一份精致早餐', triggerType: 'days', triggerValue: 7, status: 'claimed', claimedAt: addDays(now, -8) },
        { id: uid('r'), name: '中段奖励', content: '一次城市晨跑', triggerType: 'progress', triggerValue: 50, status: 'locked' },
      ],
      progress: 28,
      manualDeduction: 0,
      archived: false,
      fixed: false,
      color: 'mint',
      icon: '🌅',
    },
    {
      id: uid('g'),
      name: '每周阅读 2 小时',
      category: 'habit',
      finalGoal: '让阅读成为日常',
      coreNeed: '每天 20 分钟稳定阅读，持续 60 天',
      deadline: addDays(now, 50),
      createdAt: addDays(now, -10),
      totalDescription: '通过固定时段的轻阅读，让阅读自然嵌入生活',
      phases: [
        {
          id: uid('p'),
          name: '入门',
          description: '每天 10 分钟轻阅读',
          totalMinutes: 150,
          startDate: addDays(now, -10),
          endDate: addDays(now, 10),
          completed: false,
        },
        {
          id: uid('p'),
          name: '进阶',
          description: '每天 15 分钟，专注主题阅读',
          totalMinutes: 250,
          startDate: addDays(now, 10),
          endDate: addDays(now, 30),
          completed: false,
        },
        {
          id: uid('p'),
          name: '固化',
          description: '每天 20 分钟，建立读书笔记',
          totalMinutes: 360,
          startDate: addDays(now, 30),
          endDate: addDays(now, 50),
          completed: false,
        },
      ],
      dailyHabit: {
        description: '睡前 10 分钟轻阅读，记录一句触动你的话',
        duration: 10,
        autoLevelUp: true,
        levelUpStep: 1,
      },
      checkins: buildCheckins(10, 0, 1),
      rewards: [
        { id: uid('r'), name: '阅读基金', content: '购置 1 本心仪新书', triggerType: 'days', triggerValue: 14, status: 'available' },
      ],
      progress: 18,
      manualDeduction: 0,
      archived: false,
      fixed: false,
      color: 'lavender',
      icon: '✍️',
    },
  ];
}

export function seedReviews(goals: Goal[]): ReviewReport[] {
  const now = todayStr();
  return [
    {
      id: uid('rev'),
      type: 'weekly',
      title: '本周复盘报告',
      date: now,
      goalId: goals[0].id,
      goalName: goals[0].name,
      metrics: {
        checkinRate: 86,
        avgDuration: 11,
        missedDays: 1,
        progressDelta: 6,
        totalMinutes: 77,
      },
      suggestions: [
        '未完成原因多为「忘记提醒」，建议将打卡提醒与「晚饭后」绑定形成习惯堆叠',
        '本周平均时长 11 分钟，已超目标 10%，可以考虑下周自动进阶到 12 分钟',
      ],
    },
    {
      id: uid('rev'),
      type: 'manual',
      title: '阶段小结：Python 基础语法',
      date: addDays(now, -2),
      goalId: goals[0].id,
      goalName: goals[0].name,
      content:
        '基础语法部分已经过完一遍，对变量、循环、条件语句更顺手了。\n下一阶段开始进入函数与数据结构，准备先把字典练熟。\n感受：晚上 7 点的固定时间确实更容易开始，惯性建立成功。',
      isFavorite: true,
    },
    {
      id: uid('rev'),
      type: 'monthly',
      title: '本月复盘报告',
      date: addDays(now, -3),
      metrics: {
        checkinRate: 78,
        avgDuration: 10,
        missedDays: 6,
        progressDelta: 22,
        totalMinutes: 280,
      },
      suggestions: [
        '本月共有 3 个目标并行，建议优先保证 1 个核心目标的稳定打卡',
        '出差期间打卡率下降明显，下次可提前设置「特殊场景」自动适配',
      ],
    },
  ];
}

export function seedScenes(): SpecialScene[] {
  return [];
}

export function seedProfile(): UserProfile {
  return {
    nickname: '清晨的微光',
    joinedAt: '2026-03-12',
    badges: ['原子坚持者', '早起初心人'],
    totalCheckinDays: 42,
    fixedHabitsCount: 0,
  };
}

export function seedSettings(): AppSettings {
  return {
    reminderTime: '19:00',
    reminderRepeat: 3,
    reviewReminderEnabled: true,
    reviewReminderTime: '19:00',
    pushEnabled: true,
    theme: 'light',
    dataRetention: '1y',
    customEncouragements: [],
    defaultProgressDeduction: 1,
  };
}
