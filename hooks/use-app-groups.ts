import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppGroup } from '@/types/app-group';

const APP_GROUPS_KEY = '@app_groups';

export function useAppGroups() {
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const saved = await AsyncStorage.getItem(APP_GROUPS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const groupsWithDates = parsed.map((g: any) => ({
          ...g,
          createdAt: new Date(g.createdAt),
          updatedAt: new Date(g.updatedAt),
        }));
        setGroups(groupsWithDates);
      }
    } catch (error) {
      console.error('Error loading app groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGroups = async (newGroups: AppGroup[]) => {
    try {
      await AsyncStorage.setItem(APP_GROUPS_KEY, JSON.stringify(newGroups));
      setGroups(newGroups);
    } catch (error) {
      console.error('Error saving app groups:', error);
    }
  };

  const addGroup = useCallback(async (group: AppGroup) => {
    const newGroups = [...groups, group];
    await saveGroups(newGroups);
  }, [groups]);

  const updateGroup = useCallback(async (id: string, updates: Partial<AppGroup>) => {
    const newGroups = groups.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: new Date() } : g));
    await saveGroups(newGroups);
  }, [groups]);

  const deleteGroup = useCallback(async (id: string) => {
    const newGroups = groups.filter((g) => g.id !== id);
    await saveGroups(newGroups);
  }, [groups]);

  return {
    groups,
    isLoading,
    addGroup,
    updateGroup,
    deleteGroup,
  };
}

