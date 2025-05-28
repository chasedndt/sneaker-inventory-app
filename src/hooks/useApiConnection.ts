import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 30000; // 30 seconds

interface UseApiConnectionResult {
  isConnected: boolean;
  connectionError: string | null;
  retryCount: number;
  isCheckingConnection: boolean;
  checkConnection: () => Promise<boolean>;
  resetConnectionState: () => void;
  stopRetrying: () => void;
}

/**
 * Custom hook to manage API connection status with retry mechanism
 * @returns Object with connection state and methods
 */
export function useApiConnection(): UseApiConnectionResult {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const retryTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Clean up any retry timers when unmounting
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (retryTimerIdRef.current) {
        clearTimeout(retryTimerIdRef.current);
        retryTimerIdRef.current = null;
      }
    };
  }, []);

  /**
   * Calculate delay for exponential backoff
   */
  const calculateRetryDelay = useCallback((attempt: number): number => {
    // Exponential backoff with a max limit
    return Math.min(INITIAL_RETRY_DELAY * Math.pow(1.5, attempt), MAX_RETRY_DELAY);
  }, []);

  /**
   * Stop retrying connection attempts
   */
  const stopRetrying = useCallback(() => {
    if (retryTimerIdRef.current) {
      clearTimeout(retryTimerIdRef.current);
      retryTimerIdRef.current = null;
    }
    setRetryCount(0);
  }, []);

  /**
   * Check API connection with retry mechanism
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    // Prevent multiple simultaneous connection checks
    if (isCheckingConnection) {
      return isConnected;
    }
    
    try {
      setIsCheckingConnection(true);
      await api.testConnection();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        // Connection successful
        setIsConnected(true);
        setConnectionError(null);
        setRetryCount(0);
        
        // Clear any pending retries
        if (retryTimerIdRef.current) {
          clearTimeout(retryTimerIdRef.current);
          retryTimerIdRef.current = null;
        }
      }
      
      return true;
    } catch (error) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        // Connection failed
        setIsConnected(false);
        setConnectionError('Cannot connect to server. Please check your internet connection.');
        
        // Schedule a retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          const delay = calculateRetryDelay(retryCount);
          console.log(`API connection failed. Will retry in ${delay/1000} seconds (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          
          // Clear any existing timer
          if (retryTimerIdRef.current) {
            clearTimeout(retryTimerIdRef.current);
          }
          
          // Set new timer for retry
          const nextRetryCount = retryCount + 1;
          retryTimerIdRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount(nextRetryCount);
              checkConnection();
            }
          }, delay) as unknown as NodeJS.Timeout;
        } else {
          console.log(`Maximum retry attempts (${MAX_RETRIES}) reached. Giving up.`);
        }
      }
      
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsCheckingConnection(false);
      }
    }
  }, [retryCount, calculateRetryDelay, isCheckingConnection, isConnected]);

  /**
   * Reset connection state - useful when navigating back to a page
   */
  const resetConnectionState = useCallback(() => {
    if (retryTimerIdRef.current) {
      clearTimeout(retryTimerIdRef.current);
      retryTimerIdRef.current = null;
    }
    setRetryCount(0);
    setConnectionError(null);
    setIsConnected(true);
  }, []);

  return {
    isConnected,
    connectionError,
    retryCount,
    isCheckingConnection,
    checkConnection,
    resetConnectionState,
    stopRetrying
  };
}
