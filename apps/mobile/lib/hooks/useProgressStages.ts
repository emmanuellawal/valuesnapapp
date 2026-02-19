import { useState, useEffect, useCallback, useRef } from 'react';

import type { ProgressStage } from '@/components/molecules/progress-indicator';

/**
 * Stage timing configuration (milliseconds).
 * Based on typical backend processing times:
 * - AI Identification: 3-5s
 * - eBay Market Data: 2-4s
 * - Confidence Calculation: <1s
 */
const STAGE_TIMINGS: Record<ProgressStage, { start: number; duration: number }> = {
  analyzing: { start: 0, duration: 3000 },       // 0-3s
  identifying: { start: 3000, duration: 2000 },  // 3-5s
  market_data: { start: 5000, duration: 3000 },  // 5-8s
  calculating: { start: 8000, duration: 2000 },  // 8-10s
};

/**
 * Ordered list of stages for iteration.
 */
const STAGE_ORDER: ProgressStage[] = ['analyzing', 'identifying', 'market_data', 'calculating'];

/**
 * Overtime threshold - when to show "Almost done..." message.
 */
const OVERTIME_THRESHOLD_MS = 10000;

export interface UseProgressStagesOptions {
  /**
   * Whether processing is currently active.
   * When false, the hook resets to initial state.
   */
  isProcessing: boolean;
  
  /**
   * Callback when processing completes externally.
   * Allows the hook to jump to final stage smoothly.
   */
  onComplete?: () => void;
}

export interface UseProgressStagesReturn {
  /**
   * Current processing stage.
   */
  stage: ProgressStage;
  
  /**
   * Progress within the current stage (0-100).
   */
  stageProgress: number;
  
  /**
   * Total elapsed time in milliseconds.
   */
  elapsedMs: number;
  
  /**
   * Whether processing has exceeded the expected time (>10s).
   */
  isOvertime: boolean;
  
  /**
   * Manually complete the progress (jump to 100%).
   * Call this when the actual API response arrives.
   */
  complete: () => void;
}

/**
 * useProgressStages - Time-Based Progress Stage Management
 * 
 * Manages stage transitions based on elapsed time, simulating backend
 * processing stages. Since we don't have streaming responses from the
 * backend, this hook approximates progress based on typical API timing.
 * 
 * **Stage Flow:**
 * 1. "Analyzing photo..." (0-3s)
 * 2. "Identifying item..." (3-5s)
 * 3. "Finding market data..." (5-8s)
 * 4. "Calculating value..." (8-10s)
 * 
 * **Overtime Handling:**
 * If processing exceeds 10 seconds, `isOvertime` becomes true,
 * signaling the UI to show "Almost done..." instead of stage text.
 * 
 * @example
 * ```tsx
 * const { stage, stageProgress, isOvertime, complete } = useProgressStages({
 *   isProcessing: true,
 * });
 * 
 * // When API responds:
 * useEffect(() => {
 *   if (apiResponse) {
 *     complete();
 *   }
 * }, [apiResponse, complete]);
 * ```
 */
export function useProgressStages({
  isProcessing,
}: UseProgressStagesOptions): UseProgressStagesReturn {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when processing starts
  useEffect(() => {
    if (isProcessing && !isCompleted) {
      startTimeRef.current = Date.now();
      setElapsedMs(0);
      
      // Update elapsed time every 50ms for smooth progress
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedMs(Date.now() - startTimeRef.current);
        }
      }, 50);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isProcessing, isCompleted]);

  // Reset when processing stops
  useEffect(() => {
    if (!isProcessing) {
      setElapsedMs(0);
      setIsCompleted(false);
      startTimeRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isProcessing]);

  // Calculate current stage based on elapsed time
  const getCurrentStage = useCallback((): ProgressStage => {
    if (isCompleted) {
      return 'calculating'; // Final stage when complete
    }
    
    for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
      const stage = STAGE_ORDER[i];
      if (elapsedMs >= STAGE_TIMINGS[stage].start) {
        return stage;
      }
    }
    
    return 'analyzing'; // Default to first stage
  }, [elapsedMs, isCompleted]);

  // Calculate progress within current stage (0-100)
  const getStageProgress = useCallback((): number => {
    if (isCompleted) {
      return 100;
    }
    
    const stage = getCurrentStage();
    const timing = STAGE_TIMINGS[stage];
    const progressInStage = elapsedMs - timing.start;
    const percentage = Math.min((progressInStage / timing.duration) * 100, 100);
    
    return Math.max(0, percentage);
  }, [elapsedMs, isCompleted, getCurrentStage]);

  // Complete handler - jump to final state
  const complete = useCallback(() => {
    setIsCompleted(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stage = getCurrentStage();
  const stageProgress = getStageProgress();
  const isOvertime = elapsedMs > OVERTIME_THRESHOLD_MS && !isCompleted;

  return {
    stage,
    stageProgress,
    elapsedMs,
    isOvertime,
    complete,
  };
}
