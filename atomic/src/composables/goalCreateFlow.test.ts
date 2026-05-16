import { describe, expect, it } from 'vitest';
import {
  buildGoalFromCreateForm,
  completionDaysRoundedFromForm,
  perDayMinutesFromForm,
  plannedTotalMinutesFromForm,
  validateGoalCreateStep,
  type GoalCreateFormInput,
} from './goalCreateFlow';

const base = (): GoalCreateFormInput => ({
  category: 'habit',
  customCategoryName: '',
  name: '晨读',
  finalGoal: '读完一本书',
  coreNeed: '',
  deadline: '2030-12-31',
  totalDescription: '',
  completionDays: 30,
  dailyHours: 0,
  dailyMinutes: 30,
  dailyDescription: '每天读 30 分钟',
  daysPerWeek: 7,
  icon: '📚',
  color: 'brand',
});

describe('goalCreateFlow', () => {
  it('perDayMinutesFromForm sums hours and minutes', () => {
    const f = base();
    f.dailyHours = 1;
    f.dailyMinutes = 15;
    expect(perDayMinutesFromForm(f)).toBe(75);
  });

  it('completionDaysRoundedFromForm floors to at least 1', () => {
    expect(completionDaysRoundedFromForm({ ...base(), completionDays: 0.2 })).toBe(1);
    expect(completionDaysRoundedFromForm({ ...base(), completionDays: 14 })).toBe(14);
  });

  it('plannedTotalMinutesFromForm matches days × per day', () => {
    const f = base();
    f.completionDays = 10;
    f.dailyHours = 0;
    f.dailyMinutes = 20;
    expect(plannedTotalMinutesFromForm(f)).toBe(200);
  });

  describe('validateGoalCreateStep', () => {
    const today = '2026-05-16';

    it('step 1 requires name, finalGoal, deadline on/after today', () => {
      expect(validateGoalCreateStep(1, base(), today)).toBe(true);
      expect(validateGoalCreateStep(1, { ...base(), name: '  ' }, today)).toBe(false);
      expect(validateGoalCreateStep(1, { ...base(), finalGoal: '' }, today)).toBe(false);
      expect(validateGoalCreateStep(1, { ...base(), deadline: '2026-05-15' }, today)).toBe(false);
    });

    it('step 2 requires days ≥1 and perDay ≥1 minute', () => {
      expect(validateGoalCreateStep(2, base(), today)).toBe(true);
      expect(validateGoalCreateStep(2, { ...base(), completionDays: 0 }, today)).toBe(false);
      expect(validateGoalCreateStep(2, { ...base(), dailyHours: 0, dailyMinutes: 0 }, today)).toBe(false);
    });

    it('step 3 requires daily description and daysPerWeek in 1–7', () => {
      expect(validateGoalCreateStep(3, base(), today)).toBe(true);
      expect(validateGoalCreateStep(3, { ...base(), dailyDescription: '' }, today)).toBe(false);
      expect(validateGoalCreateStep(3, { ...base(), daysPerWeek: 0 }, today)).toBe(false);
      expect(validateGoalCreateStep(3, { ...base(), daysPerWeek: 8 }, today)).toBe(false);
    });
  });

  describe('buildGoalFromCreateForm', () => {
    it('builds phase totalMinutes = days × daily minutes', () => {
      const f = base();
      f.completionDays = 5;
      f.dailyHours = 0;
      f.dailyMinutes = 12;
      const g = buildGoalFromCreateForm(f, {
        goalId: 'g_test',
        phaseId: 'p_test',
        createdAt: '2026-05-01',
      });
      expect(g.id).toBe('g_test');
      expect(g.phases).toHaveLength(1);
      expect(g.phases[0].totalMinutes).toBe(60);
      expect(g.phases[0].startDate).toBe('2026-05-01');
      expect(g.phases[0].endDate).toBe(f.deadline);
      expect(g.dailyHabit.duration).toBe(12);
      expect(g.dailyHabit.daysPerWeek).toBe(7);
      expect(g.dailyHabit.autoLevelUp).toBe(false);
    });

    it('uses totalDescription or finalGoal for phase description', () => {
      const f = { ...base(), totalDescription: '  总说明  ' };
      const g = buildGoalFromCreateForm(f, { goalId: 'g1', phaseId: 'p1', createdAt: '2026-01-01' });
      expect(g.phases[0].description).toBe('总说明');
      const g2 = buildGoalFromCreateForm(
        { ...base(), totalDescription: '' },
        { goalId: 'g2', phaseId: 'p2', createdAt: '2026-01-01' },
      );
      expect(g2.phases[0].description).toBe('读完一本书');
    });

    it('custom category keeps customCategoryName', () => {
      const f = {
        ...base(),
        category: 'custom' as const,
        customCategoryName: '  副业  ',
      };
      const g = buildGoalFromCreateForm(f, { goalId: 'g3', phaseId: 'p3', createdAt: '2026-01-01' });
      expect(g.customCategoryName).toBe('副业');
    });

    it('clamps daysPerWeek to 1–7', () => {
      const g = buildGoalFromCreateForm(
        { ...base(), daysPerWeek: 9 },
        { goalId: 'g4', phaseId: 'p4', createdAt: '2026-01-01' },
      );
      expect(g.dailyHabit.daysPerWeek).toBe(7);
      const g2 = buildGoalFromCreateForm(
        { ...base(), daysPerWeek: 0 },
        { goalId: 'g5', phaseId: 'p5', createdAt: '2026-01-01' },
      );
      expect(g2.dailyHabit.daysPerWeek).toBe(1);
    });
  });
});
