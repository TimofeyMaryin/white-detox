/**
 * Blocker Context
 *
 * Global state management for app blocking functionality.
 * Manages blocking state, schedules, and coordinates with DeviceActivity API.
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
  /** Current blocking state */
  state: BlockerState;
  /** All saved schedules */
  schedules: BlockerSchedule[];
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Screen Time authorization status */
  authorizationStatus: AuthorizationStatusType;
  /** Request Screen Time authorization */
  requestAuthorization: () => Promise<void>;
  /** Start blocking apps (optionally for specific schedule) */
  startBlocking: (scheduleId?: string) => Promise<void>;
  /** Stop blocking and save accumulated time */
  stopBlocking: () => Promise<void>;
  /** Pause blocking (keeps time accumulated) */
  pauseBlocking: () => Promise<void>;
  /** Resume paused blocking */
  resumeBlocking: () => Promise<void>;
  /** Add a new schedule */
  addSchedule: (schedule: BlockerSchedule) => Promise<void>;
  /** Update an existing schedule */
  updateSchedule: (id: string, updates: Partial<BlockerSchedule>) => Promise<void>;
  /** Delete a schedule and stop its monitoring */
  deleteSchedule: (id: string) => Promise<void>;
  /** Refresh schedules from storage */
  refreshSchedules: () => Promise<void>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate total elapsed time since blocking started
 *
 * @param startedAt - Timestamp when blocking started
 * @param accumulatedTime - Time accumulated before current session
 * @returns Total elapsed time in seconds
 */
function calculateElapsedTime(startedAt: number | undefined, accumulatedTime = 0): number {
  if (!startedAt) return accumulatedTime;
  const now = Date.now();
  const elapsed = Math.floor((now - startedAt) / 1000);
  return accumulatedTime + elapsed;
}

/**
 * Create default blocker state
 */
function createDefaultState(): BlockerState {
  return {
    isBlocking: false,
    isPaused: false,
    savedTime: 0,
  };
}

// ============================================================================
// Context
// ============================================================================

const BlockerContext = createContext<BlockerContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface BlockerProviderProps {
  children: ReactNode;
}

export function BlockerProvider({ children }: BlockerProviderProps) {
  const [state, setState] = useState<BlockerState>(createDefaultState());
  const [schedules, setSchedules] = useState<BlockerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authorizationStatus, setAuthorizationStatus] = useState<AuthorizationStatusType>(
    AuthorizationStatus.notDetermined
  );

  const appStateRef = useRef(AppState.currentState);

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadData();

    if (Platform.OS === 'ios') {
      setAuthorizationStatus(deviceActivityService.getAuthorizationStatus());
    }
  }, []);

  // Listen for authorization status changes
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const subscription = deviceActivityService.onAuthorizationStatusChange((status) => {
      setAuthorizationStatus(status);
    });

    return () => subscription.remove();
  }, []);

  // Listen for device activity monitor events (for debugging)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const subscription = deviceActivityService.onMonitorEvent((event) => {
      console.log('[BlockerContext] Monitor event:', event.callbackName);
    });

    return () => subscription.remove();
  }, []);

  // --------------------------------------------------------------------------
  // App State Handling
  // --------------------------------------------------------------------------

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground, recalculate elapsed time
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
  // Data Loading
  // --------------------------------------------------------------------------

  const loadData = async () => {
    try {
      const { state: savedState, schedules: savedSchedules } = await storageService.loadAll();

      if (savedState) {
        // Recalculate elapsed time if blocking was active
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

  const refreshSchedules = useCallback(async () => {
    const savedSchedules = await storageService.getSchedules();
    setSchedules(savedSchedules);
  }, []);

  // --------------------------------------------------------------------------
  // Authorization
  // --------------------------------------------------------------------------

  const requestAuthorization = useCallback(async () => {
    if (Platform.OS !== 'ios') return;

    const status = await deviceActivityService.requestAuthorization();
    setAuthorizationStatus(status);
  }, []);

  // --------------------------------------------------------------------------
  // Blocking Controls
  // --------------------------------------------------------------------------

  const startBlocking = useCallback(
    async (scheduleId?: string) => {
      const now = Date.now();

      const newState: BlockerState = {
        ...state,
        isBlocking: true,
        isPaused: false,
        startedAt: now,
        currentScheduleId: scheduleId,
        accumulatedTime: state.savedTime,
        savedTime: state.savedTime,
      };

      setState(newState);
      await storageService.saveBlockerState(newState);

      // Block apps if schedule has selection
      if (Platform.OS === 'ios' && scheduleId) {
        const schedule = schedules.find((s) => s.id === scheduleId);
        if (schedule?.familyActivitySelectionId) {
          deviceActivityService.blockApps(schedule.familyActivitySelectionId);
        }
      }
    },
    [state, schedules]
  );

  const stopBlocking = useCallback(async () => {
    const finalSavedTime = state.startedAt
      ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
      : state.savedTime;

    const newState: BlockerState = {
      ...state,
      isBlocking: false,
      isPaused: false,
      startedAt: undefined,
      currentScheduleId: undefined,
      accumulatedTime: finalSavedTime,
      savedTime: finalSavedTime,
    };

    setState(newState);
    await storageService.saveBlockerState(newState);

    // Remove all blocks
    if (Platform.OS === 'ios') {
      deviceActivityService.unblockAllApps();
    }
  }, [state]);

  const pauseBlocking = useCallback(async () => {
    const currentSavedTime = state.startedAt
      ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
      : state.savedTime;

    const newState: BlockerState = {
      ...state,
      isPaused: true,
      pausedAt: new Date(),
      startedAt: undefined,
      accumulatedTime: currentSavedTime,
      savedTime: currentSavedTime,
    };

    setState(newState);
    await storageService.saveBlockerState(newState);
  }, [state]);

  const resumeBlocking = useCallback(async () => {
    const now = Date.now();

    const newState: BlockerState = {
      ...state,
      isPaused: false,
      pausedAt: undefined,
      startedAt: now,
    };

    setState(newState);
    await storageService.saveBlockerState(newState);
  }, [state]);

  // --------------------------------------------------------------------------
  // Schedule Management
  // --------------------------------------------------------------------------

  const addSchedule = useCallback(
    async (schedule: BlockerSchedule) => {
      const newSchedules = [...schedules, schedule];
      await storageService.saveSchedules(newSchedules);
      setSchedules(newSchedules);

      // Start monitoring if schedule is active
      if (
        Platform.OS === 'ios' &&
        schedule.isActive &&
        schedule.familyActivitySelectionId &&
        schedule.daysOfWeek.length > 0
      ) {
        await deviceActivityService.startMonitoring(schedule);
      }
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

      // Update monitoring
      if (Platform.OS === 'ios') {
        await deviceActivityService.updateMonitoring(existingSchedule, updatedSchedule);
      }
    },
    [schedules]
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      const scheduleToDelete = schedules.find((s) => s.id === id);

      // Stop monitoring and clear blocks
      if (Platform.OS === 'ios' && scheduleToDelete?.daysOfWeek) {
        deviceActivityService.stopMonitoring(id, scheduleToDelete.daysOfWeek);
        deviceActivityService.unblockAllApps();
      }

      // Stop timer if blocking is active (only one schedule allowed)
      if (state.isBlocking) {
        const finalSavedTime = state.startedAt
          ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
          : state.savedTime;

        const newState: BlockerState = {
          ...state,
          isBlocking: false,
          isPaused: false,
          startedAt: undefined,
          currentScheduleId: undefined,
          accumulatedTime: finalSavedTime,
          savedTime: finalSavedTime,
        };

        setState(newState);
        await storageService.saveBlockerState(newState);
      }

      // Remove from schedules
      const newSchedules = schedules.filter((s) => s.id !== id);
      await storageService.saveSchedules(newSchedules);
      setSchedules(newSchedules);
    },
    [schedules, state]
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
        requestAuthorization,
        startBlocking,
        stopBlocking,
        pauseBlocking,
        resumeBlocking,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        refreshSchedules,
      }}
    >
      {children}
    </BlockerContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access blocker context
 *
 * @returns Blocker context with state and actions
 * @throws Error if used outside BlockerProvider
 *
 * @example
 * ```tsx
 * const { state, startBlocking, stopBlocking } = useBlocker();
 *
 * if (state.isBlocking) {
 *   return <BlockingActive onStop={stopBlocking} />;
 * }
 * ```
 */
export function useBlocker(): BlockerContextType {
  const context = useContext(BlockerContext);

  if (!context) {
    throw new Error('useBlocker must be used within a BlockerProvider');
  }

  return context;
}
