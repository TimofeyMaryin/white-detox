/**
 * Time Formatting Utilities
 *
 * Helper functions for formatting time values.
 *
 * @module utils/timeFormatter
 */

/**
 * Format seconds into HH:MM:SS string
 *
 * @param seconds - Total seconds to format
 * @returns Formatted time string (e.g., "01:30:45")
 *
 * @example
 * ```ts
 * formatTime(3665); // "01:01:05"
 * formatTime(0);    // "00:00:00"
 * ```
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into short human-readable string
 *
 * @param seconds - Total seconds to format
 * @returns Short formatted string (e.g., "1h 30m" or "45m")
 *
 * @example
 * ```ts
 * formatTimeShort(3665); // "1h 1m"
 * formatTimeShort(300);  // "5m"
 * ```
 */
export function formatTimeShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Parse time string (HH:MM) into hours and minutes
 *
 * @param timeString - Time string in HH:MM format
 * @returns Object with hours and minutes
 *
 * @example
 * ```ts
 * parseTime("14:30"); // { hours: 14, minutes: 30 }
 * ```
 */
export function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Format hours and minutes into HH:MM string
 *
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Formatted time string (e.g., "09:30")
 */
export function formatTimeString(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
