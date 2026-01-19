/**
 * Blocker Types
 *
 * Type definitions for app blocking functionality.
 *
 * @module types/blocker
 */

/**
 * Blocking schedule configuration (UI only - no automatic scheduling)
 */
export interface BlockerSchedule {
  /** Unique identifier for the schedule */
  id: string;

  /** User-friendly name for the schedule */
  name: string;

  /** Start time in HH:mm format (UI display only) */
  startTime: string;

  /** End time in HH:mm format (UI display only) */
  endTime: string;

  /**
   * Days of week (UI display only)
   * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
   */
  daysOfWeek: number[];

  /** Whether this schedule is currently enabled */
  isActive: boolean;

  /** ID for react-native-device-activity app selection */
  familyActivitySelectionId?: string;
}

/**
 * Current blocking state
 */
export interface BlockerState {
  /** Whether app blocking is currently active */
  isBlocking: boolean;

  /** Whether blocking is temporarily paused */
  isPaused: boolean;

  /** When blocking was paused */
  pausedAt?: Date;

  /** Total saved time in seconds */
  savedTime: number;

  /** Timestamp when current blocking session started */
  startedAt?: number;

  /** Time accumulated before current session */
  accumulatedTime?: number;

  /** Current active schedule ID */
  currentScheduleId?: string;
}

/** Day names for display */
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Full day names for display */
export const DAY_NAMES_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
