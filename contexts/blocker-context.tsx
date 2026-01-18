import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { BlockerState, BlockerSchedule } from '@/types/blocker';
import ScreenTimeModule from '@/modules/screen-time';
import FamilyActivityPickerModule from '@/modules/family-activity-picker';

const BLOCKER_STATE_KEY = '@blocker_state';
const BLOCKER_SCHEDULES_KEY = '@blocker_schedules';

interface BlockerContextType {
  state: BlockerState;
  schedules: BlockerSchedule[];
  isLoading: boolean;
  startBlocking: () => Promise<void>;
  stopBlocking: () => Promise<void>;
  pauseBlocking: () => Promise<void>;
  resumeBlocking: () => Promise<void>;
  addSchedule: (schedule: BlockerSchedule) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<BlockerSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  refreshSchedules: () => Promise<void>;
}

const BlockerContext = createContext<BlockerContextType | null>(null);

// Helper function to calculate elapsed time from startedAt
const calculateElapsedTime = (startedAt: number | undefined, accumulatedTime: number = 0): number => {
  if (!startedAt) return accumulatedTime;
  const now = Date.now();
  const elapsed = Math.floor((now - startedAt) / 1000);
  return accumulatedTime + elapsed;
};

export function BlockerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BlockerState>({
    isBlocking: false,
    isPaused: false,
    savedTime: 0,
  });
  const [schedules, setSchedules] = useState<BlockerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);

  // Load state from storage
  useEffect(() => {
    loadState();
  }, []);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[DETOX_DEBUG] AppState changed:', appStateRef.current, '->', nextAppState);
      
      // When app comes to foreground, recalculate elapsed time
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        setState((prev) => {
          if (prev.isBlocking && !prev.isPaused && prev.startedAt) {
            const newSavedTime = calculateElapsedTime(prev.startedAt, prev.accumulatedTime);
            console.log('[DETOX_DEBUG] Recalculated savedTime on foreground:', newSavedTime);
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

  // Update saved time every second when blocking (only updates display, real time is calculated from startedAt)
  useEffect(() => {
    if (!state.isBlocking || state.isPaused) return;

    const interval = setInterval(() => {
      setState((prev) => {
        // Calculate real elapsed time from startedAt
        if (prev.startedAt) {
          const newSavedTime = calculateElapsedTime(prev.startedAt, prev.accumulatedTime);
          return { ...prev, savedTime: newSavedTime };
        }
        // Fallback to incrementing (shouldn't happen with new logic)
        return { ...prev, savedTime: prev.savedTime + 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isBlocking, state.isPaused]);

  const loadState = async () => {
    console.log('[DETOX_DEBUG] loadState: Starting to load state from AsyncStorage');
    try {
      const [savedState, savedSchedules] = await Promise.all([
        AsyncStorage.getItem(BLOCKER_STATE_KEY),
        AsyncStorage.getItem(BLOCKER_SCHEDULES_KEY),
      ]);

      console.log('[DETOX_DEBUG] loadState: Raw savedState:', savedState);
      console.log('[DETOX_DEBUG] loadState: Raw savedSchedules:', savedSchedules);

      if (savedState) {
        const parsed: BlockerState = JSON.parse(savedState);
        console.log('[DETOX_DEBUG] loadState: Parsed state:', parsed);
        
        // If blocking is active, recalculate elapsed time since app was closed
        if (parsed.isBlocking && !parsed.isPaused && parsed.startedAt) {
          const newSavedTime = calculateElapsedTime(parsed.startedAt, parsed.accumulatedTime);
          console.log('[DETOX_DEBUG] loadState: Recalculated savedTime:', newSavedTime, 'from startedAt:', parsed.startedAt);
          parsed.savedTime = newSavedTime;
        }
        
        setState(parsed);
      }

      if (savedSchedules) {
        const parsed = JSON.parse(savedSchedules);
        console.log('[DETOX_DEBUG] loadState: Parsed schedules count:', parsed.length);
        console.log('[DETOX_DEBUG] loadState: Schedules:', JSON.stringify(parsed, null, 2));
        setSchedules(parsed);
      }
    } catch (error) {
      console.error('[DETOX_DEBUG] loadState: Error loading blocker state:', error);
    } finally {
      console.log('[DETOX_DEBUG] loadState: Finished loading, setting isLoading=false');
      setIsLoading(false);
    }
  };

  const refreshSchedules = useCallback(async () => {
    try {
      const savedSchedules = await AsyncStorage.getItem(BLOCKER_SCHEDULES_KEY);
      if (savedSchedules) {
        setSchedules(JSON.parse(savedSchedules));
      }
    } catch (error) {
      console.error('Error refreshing schedules:', error);
    }
  }, []);

  const saveSchedules = async (newSchedules: BlockerSchedule[]) => {
    console.log('[DETOX_DEBUG] saveSchedules: Saving schedules, count:', newSchedules.length);
    console.log('[DETOX_DEBUG] saveSchedules: Schedules to save:', JSON.stringify(newSchedules, null, 2));
    try {
      await AsyncStorage.setItem(BLOCKER_SCHEDULES_KEY, JSON.stringify(newSchedules));
      console.log('[DETOX_DEBUG] saveSchedules: AsyncStorage.setItem completed');
      setSchedules(newSchedules);
      console.log('[DETOX_DEBUG] saveSchedules: setSchedules called, state should update');
    } catch (error) {
      console.error('[DETOX_DEBUG] saveSchedules: Error saving schedules:', error);
    }
  };

  const startBlocking = useCallback(async () => {
    const now = Date.now();
    const newState: BlockerState = {
      ...state,
      isBlocking: true,
      isPaused: false,
      startedAt: now, // Record when blocking started
      accumulatedTime: state.savedTime, // Keep any previously saved time
      savedTime: state.savedTime, // Start from current saved time
    };
    console.log('[DETOX_DEBUG] startBlocking: Starting with startedAt:', now);
    setState(newState);
    await AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState));
  }, [state]);

  const stopBlocking = useCallback(async () => {
    // Calculate final saved time before stopping
    const finalSavedTime = state.startedAt 
      ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
      : state.savedTime;
    
    const newState: BlockerState = {
      ...state,
      isBlocking: false,
      isPaused: false,
      startedAt: undefined,
      accumulatedTime: finalSavedTime, // Save accumulated time for next session
      savedTime: finalSavedTime,
    };
    console.log('[DETOX_DEBUG] stopBlocking: Final savedTime:', finalSavedTime);
    setState(newState);
    await AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState));
  }, [state]);

  const pauseBlocking = useCallback(async () => {
    // Calculate time saved so far and store it
    const currentSavedTime = state.startedAt 
      ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
      : state.savedTime;
    
    const newState: BlockerState = {
      ...state,
      isPaused: true,
      pausedAt: new Date(),
      startedAt: undefined, // Stop the timer
      accumulatedTime: currentSavedTime, // Store accumulated time
      savedTime: currentSavedTime,
    };
    console.log('[DETOX_DEBUG] pauseBlocking: Paused with savedTime:', currentSavedTime);
    setState(newState);
    await AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState));
  }, [state]);

  const resumeBlocking = useCallback(async () => {
    const now = Date.now();
    const newState: BlockerState = {
      ...state,
      isPaused: false,
      pausedAt: undefined,
      startedAt: now, // Restart the timer
      // accumulatedTime stays the same - we continue counting from where we left off
    };
    console.log('[DETOX_DEBUG] resumeBlocking: Resumed with startedAt:', now, 'accumulatedTime:', state.accumulatedTime);
    setState(newState);
    await AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState));
  }, [state]);

  const addSchedule = useCallback(async (schedule: BlockerSchedule) => {
    console.log('[DETOX_DEBUG] addSchedule: Called with schedule:', JSON.stringify(schedule, null, 2));
    console.log('[DETOX_DEBUG] addSchedule: Current schedules count:', schedules.length);
    const newSchedules = [...schedules, schedule];
    console.log('[DETOX_DEBUG] addSchedule: New schedules count:', newSchedules.length);
    await saveSchedules(newSchedules);
    console.log('[DETOX_DEBUG] addSchedule: saveSchedules completed');
    
    // Создать DeviceActivity расписание для автоматического выполнения
    if (schedule.isActive && schedule.apps.length > 0 && schedule.daysOfWeek.length > 0) {
      try {
        console.log('[DETOX_DEBUG] addSchedule: Creating DeviceActivity schedule');
        await ScreenTimeModule.createDeviceActivitySchedule(
          schedule.id,
          schedule.startTime,
          schedule.endTime,
          schedule.daysOfWeek
        );
        console.log('[DETOX_DEBUG] addSchedule: DeviceActivity schedule created');
      } catch (error) {
        console.error('[DETOX_DEBUG] addSchedule: Error creating DeviceActivity schedule:', error);
      }
    }
  }, [schedules]);

  const updateSchedule = useCallback(async (id: string, updates: Partial<BlockerSchedule>) => {
    console.log('[DETOX_DEBUG] updateSchedule: Called with id:', id);
    console.log('[DETOX_DEBUG] updateSchedule: Updates:', JSON.stringify(updates, null, 2));
    const existingSchedule = schedules.find((s) => s.id === id);
    console.log('[DETOX_DEBUG] updateSchedule: Existing schedule found:', !!existingSchedule);
    console.log('[DETOX_DEBUG] updateSchedule: Existing schedule:', JSON.stringify(existingSchedule, null, 2));
    const updatedSchedule = existingSchedule ? { ...existingSchedule, ...updates } : null;
    console.log('[DETOX_DEBUG] updateSchedule: Merged schedule:', JSON.stringify(updatedSchedule, null, 2));
    
    const newSchedules = schedules.map((s) => (s.id === id ? { ...s, ...updates } : s));
    console.log('[DETOX_DEBUG] updateSchedule: New schedules:', JSON.stringify(newSchedules, null, 2));
    await saveSchedules(newSchedules);
    console.log('[DETOX_DEBUG] updateSchedule: saveSchedules completed');
    
    // Обновить DeviceActivity расписание
    if (updatedSchedule) {
      try {
        // Удалить старое расписание
        console.log('[DETOX_DEBUG] updateSchedule: Removing old DeviceActivity schedule');
        await ScreenTimeModule.removeDeviceActivitySchedule(id);
        
        // Создать новое расписание, если оно активно
        if (updatedSchedule.isActive && updatedSchedule.apps.length > 0 && updatedSchedule.daysOfWeek.length > 0) {
          console.log('[DETOX_DEBUG] updateSchedule: Creating new DeviceActivity schedule');
          await ScreenTimeModule.createDeviceActivitySchedule(
            updatedSchedule.id,
            updatedSchedule.startTime,
            updatedSchedule.endTime,
            updatedSchedule.daysOfWeek
          );
        }
      } catch (error) {
        console.error('[DETOX_DEBUG] updateSchedule: Error updating DeviceActivity schedule:', error);
      }
    }
  }, [schedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    console.log('[DETOX_DEBUG] deleteSchedule: Called with id:', id);
    console.log('[DETOX_DEBUG] deleteSchedule: Current schedules count:', schedules.length);
    try {
      // First, remove the DeviceActivity schedule and clear ManagedSettingsStore
      if (ScreenTimeModule && typeof ScreenTimeModule.removeDeviceActivitySchedule === 'function') {
        console.log('[DETOX_DEBUG] deleteSchedule: Removing DeviceActivity schedule');
        await ScreenTimeModule.removeDeviceActivitySchedule(id);
      }
      
      // Clear the selection for this schedule in the native module
      if (FamilyActivityPickerModule && typeof FamilyActivityPickerModule.clearSelectionForScheduleId === 'function') {
        console.log('[DETOX_DEBUG] deleteSchedule: Clearing selection for schedule');
        await FamilyActivityPickerModule.clearSelectionForScheduleId(id);
      }
    } catch (error) {
      console.error('[DETOX_DEBUG] deleteSchedule: Error removing DeviceActivity schedule:', error);
    }
    
    const newSchedules = schedules.filter((s) => s.id !== id);
    console.log('[DETOX_DEBUG] deleteSchedule: New schedules count:', newSchedules.length);
    await saveSchedules(newSchedules);
    console.log('[DETOX_DEBUG] deleteSchedule: Completed');
  }, [schedules]);

  return (
    <BlockerContext.Provider
      value={{
        state,
        schedules,
        isLoading,
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

export function useBlocker() {
  const context = useContext(BlockerContext);
  if (!context) {
    throw new Error('useBlocker must be used within a BlockerProvider');
  }
  return context;
}
