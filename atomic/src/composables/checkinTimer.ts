import { lsGet, lsSet, todayStr } from './utils';

export interface CheckinTimerSnapshot {
  date: string;
  accumulated: number;
  running: boolean;
  runningSince: number | null;
}

const TIMER_PREFIX = 'atomic-checkin-timer';

/** 内存缓存：KeepAlive 失效或 localStorage 写入失败时仍能恢复 */
const memory = new Map<string, CheckinTimerSnapshot>();

function timerKey(goalId: string) {
  return `${TIMER_PREFIX}:${goalId}`;
}

export function loadCheckinTimer(goalId: string): CheckinTimerSnapshot | null {
  const today = todayStr();
  const mem = memory.get(goalId);
  if (mem?.date === today) return { ...mem };

  const stored = lsGet<CheckinTimerSnapshot | null>(timerKey(goalId), null);
  if (stored?.date === today) {
    memory.set(goalId, { ...stored });
    return stored;
  }
  return null;
}

export function saveCheckinTimer(
  goalId: string,
  state: Omit<CheckinTimerSnapshot, 'date'>,
) {
  const full: CheckinTimerSnapshot = { date: todayStr(), ...state };
  memory.set(goalId, full);
  lsSet(timerKey(goalId), full);
}

export function clearCheckinTimer(goalId: string) {
  memory.delete(goalId);
  try {
    localStorage.removeItem(timerKey(goalId));
  } catch {
    /* ignore */
  }
}
