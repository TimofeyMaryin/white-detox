/**
 * Schedule Utilities
 *
 * Helper functions for schedule time calculations and checks.
 *
 * @module utils/scheduleUtils
 */

import type { BlockerSchedule } from '@/types/blocker';

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if current time falls within a schedule's active period
 *
 * Handles schedules that cross midnight (e.g., 22:00 - 06:00).
 *
 * @param schedule - The schedule to check
 * @returns Whether current time is within the schedule
 *
 * @example
 * ```ts
 * if (isWithinSchedule(schedule)) {
 *   startBlocking();
 * }
 * ```
 */
export function isWithinSchedule(schedule: BlockerSchedule): boolean {
  const now = new Date();
  const currentDay = now.getDay(); // 0-6, where 0 is Sunday
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if current day is in schedule
  if (!schedule.daysOfWeek.includes(currentDay)) {
    return false;
  }

  const startTimeInMinutes = timeToMinutes(schedule.startTime);
  const endTimeInMinutes = timeToMinutes(schedule.endTime);

  // Handle schedules that cross midnight
  if (startTimeInMinutes <= endTimeInMinutes) {
    // Normal case: 09:00 - 17:00
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  } else {
    // Crosses midnight: 22:00 - 06:00
    return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
  }
}

/**
 * Calculate milliseconds until the next schedule window starts
 *
 * @param schedule - The schedule to check
 * @returns Milliseconds until start, or null if no upcoming window
 */
export function getMillisecondsUntilScheduleStart(schedule: BlockerSchedule): number | null {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const startTimeInMinutes = timeToMinutes(schedule.startTime);
  const sortedDays = [...schedule.daysOfWeek].sort((a, b) => a - b);

  if (sortedDays.length === 0) {
    return null;
  }

  // Find the next day when schedule is active
  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const targetDay = (currentDay + daysAhead) % 7;

    if (sortedDays.includes(targetDay)) {
      // If today and start time hasn't passed yet
      if (daysAhead === 0 && currentTimeInMinutes < startTimeInMinutes) {
        const minutesUntilStart = startTimeInMinutes - currentTimeInMinutes;
        return (minutesUntilStart * 60 - currentSeconds) * 1000;
      }

      // If another day
      if (daysAhead > 0) {
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const millisecondsUntilMidnight =
          ((24 - currentHours - 1) * 60 + (60 - currentMinutes - 1)) * 60 * 1000 +
          (60 - currentSeconds) * 1000;
        const millisecondsFromMidnightToStart = startTimeInMinutes * 60 * 1000;

        return (
          millisecondsUntilMidnight +
          (daysAhead - 1) * millisecondsPerDay +
          millisecondsFromMidnightToStart
        );
      }
    }
  }

  return null;
}

/**
 * Calculate milliseconds until the current schedule window ends
 *
 * @param schedule - The schedule to check
 * @returns Milliseconds until end, or null if not within schedule
 */
export function getMillisecondsUntilScheduleEnd(schedule: BlockerSchedule): number | null {
  if (!isWithinSchedule(schedule)) {
    return null;
  }

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const startTimeInMinutes = timeToMinutes(schedule.startTime);
  const endTimeInMinutes = timeToMinutes(schedule.endTime);

  // Handle schedules that cross midnight
  if (startTimeInMinutes > endTimeInMinutes) {
    if (currentTimeInMinutes >= startTimeInMinutes) {
      // After start, before midnight
      const minutesUntilMidnight = 24 * 60 - currentTimeInMinutes;
      const minutesUntilEnd = minutesUntilMidnight + endTimeInMinutes;
      return (minutesUntilEnd * 60 - currentSeconds) * 1000;
    } else {
      // After midnight, before end
      const minutesUntilEnd = endTimeInMinutes - currentTimeInMinutes;
      return (minutesUntilEnd * 60 - currentSeconds) * 1000;
    }
  }

  // Normal case
  const minutesUntilEnd = endTimeInMinutes - currentTimeInMinutes;
  return (minutesUntilEnd * 60 - currentSeconds) * 1000;
}

/**
 * Format time until schedule starts as human-readable string
 *
 * @param schedule - The schedule to check
 * @returns Formatted string like "2h 30m" or "1d 4h"
 */
export function formatTimeUntilStart(schedule: BlockerSchedule): string {
  const ms = getMillisecondsUntilScheduleStart(schedule);
  if (ms === null) return '';

  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
