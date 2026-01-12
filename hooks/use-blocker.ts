import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlockerState, BlockerSchedule } from '@/types/blocker';
import GrayscaleModule from '@/modules/grayscale';
import ScreenTimeModule from '@/modules/screen-time';

const BLOCKER_STATE_KEY = '@blocker_state';
const BLOCKER_SCHEDULES_KEY = '@blocker_schedules';

export function useBlocker() {
  const [state, setState] = useState<BlockerState>({
    isBlocking: false,
    isPaused: false,
    savedTime: 0,
    grayscaleMode: false,
  });
  const [schedules, setSchedules] = useState<BlockerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from storage
  useEffect(() => {
    loadState();
  }, []);

  // Check grayscale status when app becomes active
  useEffect(() => {
    const checkGrayscaleStatus = async () => {
      try {
        const isEnabled = await GrayscaleModule.isGrayscaleEnabled();
        setState((prev) => {
          if (prev.grayscaleMode !== isEnabled) {
            const newState = { ...prev, grayscaleMode: isEnabled };
            AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState)).catch(console.error);
            return newState;
          }
          return prev;
        });
      } catch (error) {
        console.error('Error checking grayscale status:', error);
      }
    };

    // Check on mount
    checkGrayscaleStatus();

    // Check when app becomes active (user returns from Settings)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkGrayscaleStatus();
      }
    });

    return () => {
      subscription.remove();
    };
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

  const saveState = async (newState: BlockerState) => {
    try {
      await AsyncStorage.setItem(BLOCKER_STATE_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      console.error('Error saving blocker state:', error);
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

  const toggleGrayscale = useCallback(async () => {
    // Open Settings - user needs to enable/disable grayscale manually
    // The status will be checked automatically when app becomes active
    try {
      const currentStatus = await GrayscaleModule.isGrayscaleEnabled();
      if (!currentStatus) {
        // Open Settings to enable grayscale
        await GrayscaleModule.enableGrayscale();
      } else {
        // Open Settings to disable grayscale
        await GrayscaleModule.disableGrayscale();
      }
      // Don't update state here - it will be updated when app becomes active
    } catch (error) {
      console.error('Error toggling grayscale:', error);
    }
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
    setSchedules((prevSchedules) => {
      const newSchedules = prevSchedules.filter((s) => s.id !== id);
      saveSchedules(newSchedules).catch(console.error);
      
      // Удалить DeviceActivity расписание
      ScreenTimeModule.removeDeviceActivitySchedule(id).catch(console.error);
      
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
    toggleGrayscale,
    addSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

