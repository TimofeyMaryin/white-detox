import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlockerState, BlockerSchedule } from '@/types/blocker';
import ScreenTimeModule from '@/modules/screen-time';

const BLOCKER_STATE_KEY = '@blocker_state';
const BLOCKER_SCHEDULES_KEY = '@blocker_schedules';

export function useBlocker() {
  const [state, setState] = useState<BlockerState>({
    isBlocking: false,
    isPaused: false,
    savedTime: 0,
  });
  const [schedules, setSchedules] = useState<BlockerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from storage
  useEffect(() => {
    loadState();
  }, []);

  // Update saved time every second when blocking
  useEffect(() => {
    if (!state.isBlocking || state.isPaused) return;

    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        savedTime: prev.savedTime + 1,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isBlocking, state.isPaused]);

  const loadState = async () => {
    try {
      const [savedState, savedSchedules] = await Promise.all([
        AsyncStorage.getItem(BLOCKER_STATE_KEY),
        AsyncStorage.getItem(BLOCKER_SCHEDULES_KEY),
      ]);

      if (savedState) {
        const parsed = JSON.parse(savedState);
        setState(parsed);
      }

      if (savedSchedules) {
        setSchedules(JSON.parse(savedSchedules));
      }
    } catch (error) {
      console.error('Error loading blocker state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSchedules = async (newSchedules: BlockerSchedule[]) => {
    try {
      await AsyncStorage.setItem(BLOCKER_SCHEDULES_KEY, JSON.stringify(newSchedules));
      setSchedules(newSchedules);
    } catch (error) {
      console.error('Error saving schedules:', error);
    }
  };

  const startBlocking = useCallback(async () => {
    setState((prev) => {
      const newState: BlockerState = {
        ...prev,
        isBlocking: true,
        isPaused: false,
      };
      AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState)).catch(console.error);
      return newState;
    });
  }, []);

  const stopBlocking = useCallback(async () => {
    setState((prev) => {
      const newState: BlockerState = {
        ...prev,
        isBlocking: false,
        isPaused: false,
      };
      AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState)).catch(console.error);
      return newState;
    });
  }, []);

  const pauseBlocking = useCallback(async () => {
    setState((prev) => {
      const newState: BlockerState = {
        ...prev,
        isPaused: true,
        pausedAt: new Date(),
      };
      AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState)).catch(console.error);
      return newState;
    });
  }, []);

  const resumeBlocking = useCallback(async () => {
    setState((prev) => {
      const newState: BlockerState = {
        ...prev,
        isPaused: false,
        pausedAt: undefined,
      };
      AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState)).catch(console.error);
      return newState;
    });
  }, []);

  const addSchedule = useCallback(async (schedule: BlockerSchedule) => {
    setSchedules((prevSchedules) => {
      const newSchedules = [...prevSchedules, schedule];
      saveSchedules(newSchedules).catch(console.error);
      
      // Создать DeviceActivity расписание для автоматического выполнения
      if (schedule.isActive && schedule.apps.length > 0 && schedule.daysOfWeek.length > 0) {
        ScreenTimeModule.createDeviceActivitySchedule(
          schedule.id,
          schedule.startTime,
          schedule.endTime,
          schedule.daysOfWeek
        ).catch((error) => {
          console.error('Error creating DeviceActivity schedule:', error);
        });
      }
      
      return newSchedules;
    });
  }, []);

  const updateSchedule = useCallback(async (id: string, updates: Partial<BlockerSchedule>) => {
    setSchedules((prevSchedules) => {
      const existingSchedule = prevSchedules.find((s) => s.id === id);
      const updatedSchedule = existingSchedule ? { ...existingSchedule, ...updates } : null;
      
      const newSchedules = prevSchedules.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveSchedules(newSchedules).catch(console.error);
      
      // Обновить DeviceActivity расписание
      if (updatedSchedule) {
        // Удалить старое расписание
        ScreenTimeModule.removeDeviceActivitySchedule(id).catch(console.error);
        
        // Создать новое расписание, если оно активно
        if (updatedSchedule.isActive && updatedSchedule.apps.length > 0 && updatedSchedule.daysOfWeek.length > 0) {
          ScreenTimeModule.createDeviceActivitySchedule(
            updatedSchedule.id,
            updatedSchedule.startTime,
            updatedSchedule.endTime,
            updatedSchedule.daysOfWeek
          ).catch((error) => {
            console.error('Error updating DeviceActivity schedule:', error);
          });
        }
      }
      
      return newSchedules;
    });
  }, []);

  const deleteSchedule = useCallback(async (id: string) => {
    try {
      // First, remove the DeviceActivity schedule and clear ManagedSettingsStore
      // This is done before updating state to ensure native cleanup happens
      if (ScreenTimeModule && typeof ScreenTimeModule.removeDeviceActivitySchedule === 'function') {
        await ScreenTimeModule.removeDeviceActivitySchedule(id);
      }
    } catch (error) {
      // Log but don't block deletion if native cleanup fails
      console.error('Error removing DeviceActivity schedule:', error);
    }
    
    // Then update state and storage
    setSchedules((prevSchedules) => {
      const newSchedules = prevSchedules.filter((s) => s.id !== id);
      saveSchedules(newSchedules).catch(console.error);
      return newSchedules;
    });
  }, []);

  return {
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
  };
}
