/**
 * Blocker Context
 *
 * Global state management for app blocking functionality.
 * Manages blocking state and timer without scheduling.
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

import { BlockerState } from '@/types/blocker';
import deviceActivityService from '@/services/device-activity.service';
import storageService from '@/services/storage.service';

// ============================================================================
// Types
// ============================================================================

interface BlockerContextType {
  /** Current blocking state */
  state: BlockerState;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Screen Time authorization status */
  authorizationStatus: AuthorizationStatusType;
  /** Request Screen Time authorization */
  requestAuthorization: () => Promise<void>;
  /** Start blocking apps */
  startBlocking: () => Promise<void>;
  /** Stop blocking and save accumulated time */
  stopBlocking: () => Promise<void>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate total elapsed time since blocking started
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
  const [isLoading, setIsLoading] = useState(true);
  const [authorizationStatus, setAuthorizationStatus] = useState<AuthorizationStatusType>(
    AuthorizationStatus.notDetermined
  );

  const appStateRef = useRef(AppState.currentState);

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadState();

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

  const loadState = async () => {
    try {
      const savedState = await storageService.getBlockerState();

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
    } catch (error) {
      console.error('[BlockerContext] Error loading state:', error);
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

  const startBlocking = useCallback(async () => {
    const now = Date.now();

    const newState: BlockerState = {
      ...state,
      isBlocking: true,
      isPaused: false,
      startedAt: now,
      accumulatedTime: state.savedTime,
      savedTime: state.savedTime,
    };

    setState(newState);
    await storageService.saveBlockerState(newState);
  }, [state]);

  const stopBlocking = useCallback(async () => {
    const finalSavedTime = state.startedAt
      ? calculateElapsedTime(state.startedAt, state.accumulatedTime)
      : state.savedTime;

    const newState: BlockerState = {
      ...state,
      isBlocking: false,
      isPaused: false,
      startedAt: undefined,
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

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <BlockerContext.Provider
      value={{
        state,
        isLoading,
        authorizationStatus,
        requestAuthorization,
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

/**
 * Hook to access blocker context
 *
 * @returns Blocker context with state and actions
 * @throws Error if used outside BlockerProvider
 */
export function useBlocker(): BlockerContextType {
  const context = useContext(BlockerContext);

  if (!context) {
    throw new Error('useBlocker must be used within a BlockerProvider');
  }

  return context;
}
