/**
 * Blocker Types
 *
 * Type definitions for app blocking functionality.
 *
 * @module types/blocker
 */

/**
 * Blocking schedule configuration
 *
 * Defines when and which apps should be blocked.
 */
export interface BlockerSchedule {
  /** Unique identifier for the schedule */
  id: string;

  /** User-friendly name for the schedule */
  name: string;

  /** Start time in HH:mm format (24-hour) */
  startTime: string;

  /** End time in HH:mm format (24-hour) */
  endTime: string;

  /**
   * Days of week when schedule is active
   * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
   */
  daysOfWeek: number[];

  /** Whether this schedule is currently enabled */
  isActive: boolean;

  /**
   * ID for react-native-device-activity app selection
   * Links to persisted FamilyActivitySelection
   */
  familyActivitySelectionId?: string;

  /**
   * Legacy app identifiers (deprecated)
   * @deprecated Use familyActivitySelectionId instead
   */
  apps?: string[];

  /** Pause duration in minutes (optional) */
  pauseDuration?: number;

  /** Stop time in HH:mm format (optional override) */
  stopTime?: string;
}

/**
 * Current blocking state
 *
 * Tracks whether blocking is active and accumulated time.
 */
export interface BlockerState {
  /** Whether app blocking is currently active */
  isBlocking: boolean;

  /** Whether blocking is temporarily paused */
  isPaused: boolean;

  /** When blocking was paused (for resume calculations) */
  pausedAt?: Date;

  /** ID of the currently active schedule */
  currentScheduleId?: string;

  /** Total saved time in seconds (displayed to user) */
  savedTime: number;

  /** Timestamp when current blocking session started */
  startedAt?: number;

  /** Time accumulated before current session (for pause/resume) */
  accumulatedTime?: number;
}

/**
 * Days of week constants
 */
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

/**
 * Day names for display
 */
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Full day names for display
 */
export const DAY_NAMES_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
