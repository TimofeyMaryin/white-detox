/**
 * Blocker Types
 *
 * Type definitions for app blocking functionality.
 *
 * @module types/blocker
 */

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

  /** Total saved time in seconds (displayed to user) */
  savedTime: number;

  /** Timestamp when current blocking session started */
  startedAt?: number;

  /** Time accumulated before current session (for pause/resume) */
  accumulatedTime?: number;
}
