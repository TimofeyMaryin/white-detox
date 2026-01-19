/**
 * Schedule Status Hook
 *
 * Monitors whether a schedule is currently active, waiting, or inactive.
 * Handles automatic updates and app state changes.
 *
 * @module hooks/use-schedule-status
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

import type { BlockerSchedule } from '@/types/blocker';
import {
  isWithinSchedule,
  getMillisecondsUntilScheduleStart,
  getMillisecondsUntilScheduleEnd,
  formatTimeUntilStart,
} from '@/utils/scheduleUtils';

type ScheduleStatus = 'active' | 'waiting' | 'inactive';

interface UseScheduleStatusResult {
  /** Current status of the schedule */
  status: ScheduleStatus;
  /** Formatted time until schedule starts (if waiting) */
  timeUntilStart: string;
  /** Force refresh the status */
  refresh: () => void;
}

/**
 * Hook to monitor schedule status and time until activation
 *
 * @param schedule - The schedule to monitor (or undefined)
 * @returns Status information and controls
 *
 * @example
 * ```tsx
 * const { status, timeUntilStart } = useScheduleStatus(activeSchedule);
 *
 * if (status === 'active') {
 *   return <ActiveBadge />;
 * } else if (status === 'waiting') {
 *   return <WaitingBadge time={timeUntilStart} />;
 * }
 * ```
 */
export function useScheduleStatus(schedule: BlockerSchedule | undefined): UseScheduleStatusResult {
  const [status, setStatus] = useState<ScheduleStatus>('inactive');
  const [timeUntilStart, setTimeUntilStart] = useState('');

  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Check current schedule status and set up timers
   */
  const checkScheduleStatus = useCallback(() => {
    // Clear existing timers
    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }

    if (!schedule) {
      setStatus('inactive');
      setTimeUntilStart('');
      return;
    }

    const withinSchedule = isWithinSchedule(schedule);

    if (withinSchedule) {
      setStatus('active');
      setTimeUntilStart('');

      // Set timer for when schedule ends
      const msUntilEnd = getMillisecondsUntilScheduleEnd(schedule);
      if (msUntilEnd !== null && msUntilEnd > 0) {
        scheduleTimerRef.current = setTimeout(() => {
          checkScheduleStatus();
        }, msUntilEnd);
      }
    } else {
      setStatus('waiting');

      // Update time until start
      const formattedTime = formatTimeUntilStart(schedule);
      setTimeUntilStart(formattedTime);

      // Set timer for when schedule starts
      const msUntilStart = getMillisecondsUntilScheduleStart(schedule);
      if (msUntilStart !== null && msUntilStart > 0) {
        scheduleTimerRef.current = setTimeout(() => {
          checkScheduleStatus();
        }, msUntilStart);
      }
    }
  }, [schedule]);

  /**
   * Update the "time until start" display periodically
   */
  const updateTimeDisplay = useCallback(() => {
    if (!schedule) return;

    if (!isWithinSchedule(schedule)) {
      const formattedTime = formatTimeUntilStart(schedule);
      setTimeUntilStart(formattedTime);
    }
  }, [schedule]);

  // Initial check and setup
  useEffect(() => {
    checkScheduleStatus();

    // Update time display every minute
    updateIntervalRef.current = setInterval(updateTimeDisplay, 60000);

    return () => {
      if (scheduleTimerRef.current) {
        clearTimeout(scheduleTimerRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [checkScheduleStatus, updateTimeDisplay]);

  // Re-check when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkScheduleStatus();
      }
    });

    return () => subscription.remove();
  }, [checkScheduleStatus]);

  return {
    status,
    timeUntilStart,
    refresh: checkScheduleStatus,
  };
}

export default useScheduleStatus;
