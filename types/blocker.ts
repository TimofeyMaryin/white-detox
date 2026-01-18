export interface BlockerSchedule {
  id: string;
  name: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  daysOfWeek: number[]; // 0-6, where 0 is Sunday
  isActive: boolean;
  apps: string[]; // App identifiers
  pauseDuration?: number; // in minutes
  stopTime?: string; // HH:mm format
}

export interface BlockerState {
  isBlocking: boolean;
  isPaused: boolean;
  pausedAt?: Date;
  currentScheduleId?: string;
  savedTime: number; // in seconds - total saved time (accumulated)
  startedAt?: number; // timestamp when blocking started (for calculating elapsed time)
  accumulatedTime?: number; // time accumulated before current session (for pause/resume)
}

