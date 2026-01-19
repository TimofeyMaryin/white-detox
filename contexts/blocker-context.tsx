/**
 * Blocker Context
 *
 * Global state management for app blocking functionality.
 * Schedules are UI-only - blocking is manual (Start/Stop).
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
  requestAuthorization: () => Promise<void>;
  startBlocking: (scheduleId?: string) => Promise<void>;
  stopBlocking: () => Promise<void>;
  addSchedule: (schedule: BlockerSchedule) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<BlockerSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
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
  };
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

    if (Platform.OS === 'ios') {
      deviceActivityService.unblockAllApps();
    }
  }, [state]);

  // --------------------------------------------------------------------------
  // Schedule Management (UI only - no automatic scheduling)
  // --------------------------------------------------------------------------

  const addSchedule = useCallback(
    async (schedule: BlockerSchedule) => {
      const newSchedules = [...schedules, schedule];
      await storageService.saveSchedules(newSchedules);
      setSchedules(newSchedules);
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
    },
    [schedules]
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      // Stop blocking if active
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

        if (Platform.OS === 'ios') {
          deviceActivityService.unblockAllApps();
        }
      }

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
        addSchedule,
        updateSchedule,
        deleteSchedule,
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
