/**
 * Blocker Context
 *
 * Global state management for app blocking functionality.
 * Schedules are checked while app is active (foreground mode).
 * Supports multiple simultaneous schedules with waiting mode.
 *
 * @module contexts/blocker-context
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { AuthorizationStatus, AuthorizationStatusType } from 'react-native-device-activity';

import { BlockerState, BlockerSchedule } from '@/types/blocker';
import deviceActivityService from '@/services/device-activity.service';
import storageService from '@/services/storage.service';

// ============================================================================
// Types
// ============================================================================

interface BlockerContextType {
  state: BlockerState;
  schedules: BlockerSchedule[];
  isLoading: boolean;
  authorizationStatus: AuthorizationStatusType;
  scheduleUpdatedAt: number; // Timestamp for forcing UI updates
  requestAuthorization: () => Promise<void>;
  startSchedule: (scheduleId: string) => Promise<void>;
  stopSchedule: (scheduleId: string) => Promise<void>;
  stopAllSchedules: () => Promise<void>;
  addSchedule: (schedule: BlockerSchedule) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<BlockerSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  isScheduleActive: (scheduleId: string) => boolean;
  isScheduleWaiting: (scheduleId: string) => boolean;
  // Legacy compatibility
  startBlocking: (scheduleId?: string) => Promise<void>;
  stopBlocking: () => Promise<void>;
}

// ============================================================================
// Helpers
// ============================================================================

function calculateElapsedTime(startedAt: number | undefined, accumulatedTime = 0): number {
  if (!startedAt) return accumulatedTime;
  const now = Date.now();
  const elapsed = Math.floor((now - startedAt) / 1000);
  return accumulatedTime + elapsed;
}

function createDefaultState(): BlockerState {
  return {
    isBlocking: false,
    isPaused: false,
    savedTime: 0,
    activeScheduleIds: [],
    waitingScheduleIds: [],
  };
}

/**
 * Parse time string "HH:mm" to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check schedule time status
 * Returns: 'active' if within time range, 'waiting' if before start, 'ended' if after end
 */
function getScheduleTimeStatus(schedule: BlockerSchedule): 'active' | 'waiting' | 'ended' | 'wrong_day' {
  if (!schedule.isActive || !schedule.familyActivitySelectionId) {
    return 'ended';
  }

  const now = new Date();
  const today = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);

  // Check if today is in the schedule's days
  if (!schedule.daysOfWeek.includes(today)) {
    return 'wrong_day';
  }

  // Handle overnight schedule (e.g., 22:00 - 06:00)
  if (startMinutes > endMinutes) {
    if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
      return 'active';
    }
    if (currentMinutes < startMinutes && currentMinutes >= endMinutes) {
      return 'waiting';
    }
  } else {
    // Normal schedule (e.g., 09:00 - 17:00)
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return 'active';
    }
    if (currentMinutes < startMinutes) {
      return 'waiting';
    }
  }

  return 'ended';
}

/**
 * Check if current time falls within schedule's time range
 */
function isTimeInRange(startTime: string, endTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if a schedule should be active right now (legacy)
 */
function isScheduleActiveNow(schedule: BlockerSchedule): boolean {
  return getScheduleTimeStatus(schedule) === 'active';
}

// ============================================================================
// Context
// ============================================================================

const BlockerContext = createContext<BlockerContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function BlockerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BlockerState>(createDefaultState());
  const [schedules, setSchedules] = useState<BlockerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authorizationStatus, setAuthorizationStatus] = useState<AuthorizationStatusType>(
    AuthorizationStatus.notDetermined
  );
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState<number>(Date.now());

  const appStateRef = useRef(AppState.currentState);
  const schedulesRef = useRef(schedules);
  
  // Keep schedulesRef in sync
  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadData();

    if (Platform.OS === 'ios') {
      setAuthorizationStatus(deviceActivityService.getAuthorizationStatus());
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const subscription = deviceActivityService.onAuthorizationStatusChange((status) => {
      setAuthorizationStatus(status);
    });

    return () => subscription.remove();
  }, []);

  // --------------------------------------------------------------------------
  // App State Handling
  // --------------------------------------------------------------------------

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        setState((prev) => {
          if (prev.isBlocking && !prev.isPaused && prev.startedAt) {
            const newSavedTime = calculateElapsedTime(prev.startedAt, prev.accumulatedTime);
            return { ...prev, savedTime: newSavedTime };
          }
          return prev;
        });
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // --------------------------------------------------------------------------
  // Timer
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!state.isBlocking || state.isPaused) return;

    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.startedAt) {
          const newSavedTime = calculateElapsedTime(prev.startedAt, prev.accumulatedTime);
          return { ...prev, savedTime: newSavedTime };
        }
        return { ...prev, savedTime: prev.savedTime + 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isBlocking, state.isPaused]);

  // --------------------------------------------------------------------------
  // Schedule Time Checking (Foreground mode)
  // --------------------------------------------------------------------------

  const checkSchedulesRef = useRef<() => void>();

  useEffect(() => {
    checkSchedulesRef.current = async () => {
      if (isLoading) return;

      const activeIds = state.activeScheduleIds || [];
      const waitingIds = state.waitingScheduleIds || [];
      
      let newActiveIds = [...activeIds];
      let newWaitingIds = [...waitingIds];
      let hasChanges = false;

      // Check each active schedule - stop if time ended
      for (const scheduleId of activeIds) {
        const schedule = schedulesRef.current.find(s => s.id === scheduleId);
        if (!schedule) {
          newActiveIds = newActiveIds.filter(id => id !== scheduleId);
          hasChanges = true;
          continue;
        }

        const timeStatus = getScheduleTimeStatus(schedule);
        if (timeStatus === 'ended' || timeStatus === 'wrong_day') {
          console.log('[BlockerContext] Schedule ended:', scheduleId);
          newActiveIds = newActiveIds.filter(id => id !== scheduleId);
          hasChanges = true;
        }
      }

      // Check each waiting schedule - start if time came
      for (const scheduleId of waitingIds) {
        const schedule = schedulesRef.current.find(s => s.id === scheduleId);
        if (!schedule) {
          newWaitingIds = newWaitingIds.filter(id => id !== scheduleId);
          hasChanges = true;
          continue;
        }

        const timeStatus = getScheduleTimeStatus(schedule);
        if (timeStatus === 'active') {
          console.log('[BlockerContext] Schedule starting (was waiting):', scheduleId);
          newWaitingIds = newWaitingIds.filter(id => id !== scheduleId);
          newActiveIds.push(scheduleId);
          hasChanges = true;
          
          // Block apps for this schedule
          if (Platform.OS === 'ios' && schedule.familyActivitySelectionId) {
            deviceActivityService.blockApps(schedule.familyActivitySelectionId);
          }
        } else if (timeStatus === 'ended' || timeStatus === 'wrong_day') {
          // Time passed while app was in background
          console.log('[BlockerContext] Schedule time passed while waiting:', scheduleId);
          newWaitingIds = newWaitingIds.filter(id => id !== scheduleId);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const isBlocking = newActiveIds.length > 0;
        const finalSavedTime = !isBlocking && state.startedAt
          ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
          : state.savedTime;

        // If no more active schedules, reset blocks
        if (!isBlocking && activeIds.length > 0 && Platform.OS === 'ios') {
          deviceActivityService.unblockAllApps();
        }

        const newState: BlockerState = {
          ...state,
          isBlocking,
          activeScheduleIds: newActiveIds,
          waitingScheduleIds: newWaitingIds,
          currentScheduleId: newActiveIds[0], // Legacy compatibility
          startedAt: isBlocking && !state.startedAt ? Date.now() : (isBlocking ? state.startedAt : undefined),
          accumulatedTime: !isBlocking ? finalSavedTime : state.accumulatedTime,
          savedTime: !isBlocking ? finalSavedTime : state.savedTime,
        };

        setState(newState);
        await storageService.saveBlockerState(newState);
      }
    };
  }, [state, isLoading]);

  // Check schedules every 10 seconds while app is active
  useEffect(() => {
    if (isLoading) return;

    // Initial check
    checkSchedulesRef.current?.();

    const interval = setInterval(() => {
      checkSchedulesRef.current?.();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isLoading]);

  // Also check when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App became active - check schedules
        setTimeout(() => {
          checkSchedulesRef.current?.();
        }, 500);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // --------------------------------------------------------------------------
  // Data Loading
  // --------------------------------------------------------------------------

  const loadData = async () => {
    try {
      const { state: savedState, schedules: savedSchedules } = await storageService.loadAll();

      if (savedState) {
        if (savedState.isBlocking && !savedState.isPaused && savedState.startedAt) {
          savedState.savedTime = calculateElapsedTime(
            savedState.startedAt,
            savedState.accumulatedTime
          );
        }
        setState(savedState);
      }

      setSchedules(savedSchedules);
    } catch (error) {
      console.error('[BlockerContext] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Authorization
  // --------------------------------------------------------------------------

  const requestAuthorization = useCallback(async () => {
    if (Platform.OS !== 'ios') return;

    const status = await deviceActivityService.requestAuthorization();
    setAuthorizationStatus(status);
  }, []);

  // --------------------------------------------------------------------------
  // Schedule Status Helpers
  // --------------------------------------------------------------------------

  const isScheduleActive = useCallback((scheduleId: string): boolean => {
    return (state.activeScheduleIds || []).includes(scheduleId);
  }, [state.activeScheduleIds]);

  const isScheduleWaiting = useCallback((scheduleId: string): boolean => {
    return (state.waitingScheduleIds || []).includes(scheduleId);
  }, [state.waitingScheduleIds]);

  // --------------------------------------------------------------------------
  // Blocking Controls (Multi-schedule support)
  // --------------------------------------------------------------------------

  const startSchedule = useCallback(
    async (scheduleId: string) => {
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (!schedule || !schedule.familyActivitySelectionId) return;

      const activeIds = state.activeScheduleIds || [];
      const waitingIds = state.waitingScheduleIds || [];

      // Already active or waiting
      if (activeIds.includes(scheduleId) || waitingIds.includes(scheduleId)) {
        return;
      }

      const timeStatus = getScheduleTimeStatus(schedule);
      const now = Date.now();

      if (timeStatus === 'active') {
        // Start blocking immediately
        console.log('[BlockerContext] Starting schedule immediately:', scheduleId);
        
        const newActiveIds = [...activeIds, scheduleId];
        const wasBlocking = state.isBlocking;

        const newState: BlockerState = {
          ...state,
          isBlocking: true,
          isPaused: false,
          startedAt: wasBlocking ? state.startedAt : now,
          currentScheduleId: newActiveIds[0],
          activeScheduleIds: newActiveIds,
          accumulatedTime: wasBlocking ? state.accumulatedTime : state.savedTime,
          isAutomatic: false,
        };

        setState(newState);
        await storageService.saveBlockerState(newState);

        // Block apps
        if (Platform.OS === 'ios') {
          deviceActivityService.blockApps(schedule.familyActivitySelectionId);
        }
      } else if (timeStatus === 'waiting') {
        // Add to waiting list
        console.log('[BlockerContext] Schedule waiting for start time:', scheduleId);
        
        const newWaitingIds = [...waitingIds, scheduleId];

        const newState: BlockerState = {
          ...state,
          waitingScheduleIds: newWaitingIds,
        };

        setState(newState);
        await storageService.saveBlockerState(newState);
      } else {
        // Time already passed or wrong day
        console.log('[BlockerContext] Schedule time not applicable:', scheduleId, timeStatus);
      }
    },
    [state, schedules]
  );

  const stopSchedule = useCallback(
    async (scheduleId: string) => {
      const activeIds = state.activeScheduleIds || [];
      const waitingIds = state.waitingScheduleIds || [];

      const newActiveIds = activeIds.filter(id => id !== scheduleId);
      const newWaitingIds = waitingIds.filter(id => id !== scheduleId);

      const isBlocking = newActiveIds.length > 0;
      const wasBlocking = activeIds.includes(scheduleId);

      const finalSavedTime = !isBlocking && state.startedAt
        ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
        : state.savedTime;

      const newState: BlockerState = {
        ...state,
        isBlocking,
        activeScheduleIds: newActiveIds,
        waitingScheduleIds: newWaitingIds,
        currentScheduleId: newActiveIds[0],
        startedAt: isBlocking ? state.startedAt : undefined,
        accumulatedTime: !isBlocking ? finalSavedTime : state.accumulatedTime,
        savedTime: !isBlocking ? finalSavedTime : state.savedTime,
      };

      setState(newState);
      await storageService.saveBlockerState(newState);

      // Reset all blocks and re-apply remaining active schedules
      if (Platform.OS === 'ios' && wasBlocking) {
        deviceActivityService.unblockAllApps();
        
        // Re-block remaining active schedules
        for (const id of newActiveIds) {
          const schedule = schedules.find(s => s.id === id);
          if (schedule?.familyActivitySelectionId) {
            deviceActivityService.blockApps(schedule.familyActivitySelectionId);
          }
        }
      }
    },
    [state, schedules]
  );

  const stopAllSchedules = useCallback(async () => {
    const finalSavedTime = state.startedAt
      ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
      : state.savedTime;

    const newState: BlockerState = {
      ...state,
      isBlocking: false,
      isPaused: false,
      startedAt: undefined,
      currentScheduleId: undefined,
      activeScheduleIds: [],
      waitingScheduleIds: [],
      accumulatedTime: finalSavedTime,
      savedTime: finalSavedTime,
      isAutomatic: false,
    };

    setState(newState);
    await storageService.saveBlockerState(newState);

    if (Platform.OS === 'ios') {
      deviceActivityService.unblockAllApps();
    }
  }, [state]);

  // Legacy compatibility
  const startBlocking = useCallback(
    async (scheduleId?: string) => {
      if (scheduleId) {
        await startSchedule(scheduleId);
      }
    },
    [startSchedule]
  );

  const stopBlocking = useCallback(async () => {
    await stopAllSchedules();
  }, [stopAllSchedules]);

  // --------------------------------------------------------------------------
  // Schedule Management
  // --------------------------------------------------------------------------

  const addSchedule = useCallback(
    async (schedule: BlockerSchedule) => {
      const newSchedules = [...schedules, schedule];
      await storageService.saveSchedules(newSchedules);
      setSchedules(newSchedules);
      setScheduleUpdatedAt(Date.now());
    },
    [schedules]
  );

  const updateSchedule = useCallback(
    async (id: string, updates: Partial<BlockerSchedule>) => {
      const existingSchedule = schedules.find((s) => s.id === id);
      if (!existingSchedule) return;

      const updatedSchedule = { ...existingSchedule, ...updates };
      const newSchedules = schedules.map((s) => (s.id === id ? updatedSchedule : s));

      await storageService.saveSchedules(newSchedules);
      setSchedules(newSchedules);
      setScheduleUpdatedAt(Date.now());

      // If this schedule is currently active, refresh blocking
      const activeIds = state.activeScheduleIds || [];
      if (activeIds.includes(id) && Platform.OS === 'ios') {
        console.log('[BlockerContext] Refreshing blocks for active schedule:', id);
        
        // Reset and re-apply all blocks
        deviceActivityService.unblockAllApps();
        
        for (const activeId of activeIds) {
          const schedule = activeId === id ? updatedSchedule : schedules.find(s => s.id === activeId);
          if (schedule?.familyActivitySelectionId) {
            deviceActivityService.blockApps(schedule.familyActivitySelectionId);
          }
        }
      }
    },
    [schedules, state.activeScheduleIds]
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      const activeIds = state.activeScheduleIds || [];
      const waitingIds = state.waitingScheduleIds || [];

      // Stop this schedule if active or waiting
      if (activeIds.includes(id) || waitingIds.includes(id)) {
        await stopSchedule(id);
      }

      const newSchedules = schedules.filter((s) => s.id !== id);
      await storageService.saveSchedules(newSchedules);
      setSchedules(newSchedules);
      setScheduleUpdatedAt(Date.now());
    },
    [schedules, state.activeScheduleIds, state.waitingScheduleIds, stopSchedule]
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <BlockerContext.Provider
      value={{
        state,
        schedules,
        isLoading,
        authorizationStatus,
        scheduleUpdatedAt,
        requestAuthorization,
        startSchedule,
        stopSchedule,
        stopAllSchedules,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        isScheduleActive,
        isScheduleWaiting,
        // Legacy compatibility
        startBlocking,
        stopBlocking,
      }}
    >
      {children}
    </BlockerContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useBlocker(): BlockerContextType {
  const context = useContext(BlockerContext);

  if (!context) {
    throw new Error('useBlocker must be used within a BlockerProvider');
  }

  return context;
}
