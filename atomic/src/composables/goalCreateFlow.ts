/**
 * 创建目标向导：校验与组装 Goal（供 GoalCreateView 与单测共用）
 */
import { clamp, uid, todayStr } from './utils';
import type { Goal, GoalCategory, PhaseTask } from '../types';

export type GoalCreateColor = Goal['color'];

/** 与 GoalCreateView 表单对齐的快照（用于校验 / 组装） */
export interface GoalCreateFormInput {
  category: GoalCategory;
  customCategoryName: string;
  name: string;
  finalGoal: string;
  coreNeed: string;
  deadline: string;
  totalDescription: string;
  completionDays: number;
  dailyHours: number;
  dailyMinutes: number;
  dailyDescription: string;
  daysPerWeek: number;
  icon: string;
  color: GoalCreateColor;
}

export function perDayMinutesFromForm(form: Pick<GoalCreateFormInput, 'dailyHours' | 'dailyMinutes'>): number {
  const h = Math.max(0, Math.round(Number(form.dailyHours) || 0));
  const m = Math.max(0, Math.round(Number(form.dailyMinutes) || 0));
  return h * 60 + m;
}

export function completionDaysRoundedFromForm(form: Pick<GoalCreateFormInput, 'completionDays'>): number {
  return Math.max(1, Math.round(Number(form.completionDays) || 0));
}

export function plannedTotalMinutesFromForm(form: GoalCreateFormInput): number {
  const days = completionDaysRoundedFromForm(form);
  const perDay = Math.max(1, perDayMinutesFromForm(form));
  return days * perDay;
}

export function validateGoalCreateStep(
  step: 1 | 2 | 3,
  form: GoalCreateFormInput,
  today: string,
): boolean {
  if (step === 1) {
    return !!form.name.trim()
      && !!form.finalGoal.trim()
      && !!form.deadline
      && form.deadline >= today;
  }
  if (step === 2) {
    const daysOk = Number.isFinite(Number(form.completionDays))
      && Number(form.completionDays) >= 1
      && completionDaysRoundedFromForm(form) >= 1;
    return daysOk && perDayMinutesFromForm(form) >= 1;
  }
  if (step === 3) {
    return !!form.dailyDescription.trim()
      && perDayMinutesFromForm(form) >= 1
      && form.daysPerWeek >= 1
      && form.daysPerWeek <= 7;
  }
  return false;
}

export interface BuildGoalOptions {
  goalId?: string;
  phaseId?: string;
  createdAt?: string;
}

export function buildGoalFromCreateForm(form: GoalCreateFormInput, opts: BuildGoalOptions = {}): Goal {
  const createdAt = opts.createdAt ?? todayStr();
  const days = completionDaysRoundedFromForm(form);
  const minutesPerDay = Math.max(1, perDayMinutesFromForm(form));
  const phaseId = opts.phaseId ?? uid('p');
  const goalId = opts.goalId ?? uid('g');

  const phases: PhaseTask[] = [{
    id: phaseId,
    name: '整体计划',
    description: form.totalDescription.trim() || form.finalGoal.trim(),
    totalMinutes: days * minutesPerDay,
    startDate: createdAt,
    endDate: form.deadline,
    completed: false,
  }];

  return {
    id: goalId,
    name: form.name.trim(),
    category: form.category,
    customCategoryName: form.category === 'custom' ? form.customCategoryName.trim() : undefined,
    finalGoal: form.finalGoal.trim(),
    coreNeed: form.coreNeed.trim(),
    deadline: form.deadline,
    createdAt,
    totalDescription: form.totalDescription.trim() || form.finalGoal.trim(),
    phases,
    dailyHabit: {
      description: form.dailyDescription.trim(),
      duration: minutesPerDay,
      autoLevelUp: false,
      levelUpStep: 1,
      daysPerWeek: clamp(Math.round(form.daysPerWeek), 1, 7),
    },
    checkins: {},
    rewards: [],
    progress: 0,
    manualDeduction: 0,
    archived: false,
    fixed: false,
    color: form.color,
    icon: form.icon,
  };
}
