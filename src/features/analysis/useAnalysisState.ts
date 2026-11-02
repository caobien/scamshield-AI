import { useState, useCallback, useRef } from 'react';
import { AnalysisResult } from '../../types';
import { AnalysisStatus, DYNAMIC_PROGRESS_STEPS } from '../../types/stateMachine';

export interface UseAnalysisStateReturn {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  errorMessage: string | null;
  progressMessage: string;
  progressStepIndex: number;
  isAnalyzing: boolean;
  rawInputContent: string;
  
  // Transitions
  startValidation: (input: string) => void;
  startAnalyzing: () => void;
  setSuccess: (result: AnalysisResult) => void;
  setError: (msg: string) => void;
  setTimeoutError: () => void;
  reset: () => void;
}

export function useAnalysisState(): UseAnalysisStateReturn {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>(DYNAMIC_PROGRESS_STEPS[0].label);
  const [progressStepIndex, setProgressStepIndex] = useState<number>(0);
  const [rawInputContent, setRawInputContent] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  const startValidation = useCallback((input: string) => {
    clearTimers();
    setStatus('validating');
    setResult(null);
    setErrorMessage(null);
    setRawInputContent(input);
    setProgressStepIndex(0);
    setProgressMessage(DYNAMIC_PROGRESS_STEPS[0].label);
  }, [clearTimers]);

  const startAnalyzing = useCallback(() => {
    clearTimers();
    setStatus('analyzing');
    setProgressStepIndex(1);
    setProgressMessage(DYNAMIC_PROGRESS_STEPS[1].label);

    // Schedule meaningful step transitions during AI generation
    const timer1 = setTimeout(() => {
      setProgressStepIndex(2);
      setProgressMessage(DYNAMIC_PROGRESS_STEPS[2].label);
    }, 1200);

    const timer2 = setTimeout(() => {
      setStatus('validating_result');
      setProgressStepIndex(3);
      setProgressMessage(DYNAMIC_PROGRESS_STEPS[3].label);
    }, 2400);

    timerRef.current.push(timer1, timer2);
  }, [clearTimers]);

  const setSuccess = useCallback((res: AnalysisResult) => {
    clearTimers();
    setStatus('success');
    setResult(res);
    setErrorMessage(null);
  }, [clearTimers]);

  const setError = useCallback((msg: string) => {
    clearTimers();
    setStatus('error');
    setErrorMessage(msg);
    setResult(null);
  }, [clearTimers]);

  const setTimeoutError = useCallback(() => {
    clearTimers();
    setStatus('timeout');
    setErrorMessage('Hệ thống AI chưa kịp phản hồi trong thời gian quy định (30s). Vui lòng kiểm tra lại kết nối và thử lại.');
    setResult(null);
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setStatus('idle');
    setResult(null);
    setErrorMessage(null);
    setProgressStepIndex(0);
    setProgressMessage(DYNAMIC_PROGRESS_STEPS[0].label);
    setRawInputContent('');
  }, [clearTimers]);

  const isAnalyzing = status === 'validating' || status === 'analyzing' || status === 'validating_result';

  return {
    status,
    result,
    errorMessage,
    progressMessage,
    progressStepIndex,
    isAnalyzing,
    rawInputContent,
    startValidation,
    startAnalyzing,
    setSuccess,
    setError,
    setTimeoutError,
    reset,
  };
}
