import { useState } from 'react';
import { validateMessageInput } from '../../utils/validation';

export interface UseMessageAnalysisReturn {
  content: string;
  setContent: (value: string) => void;
  error: string | null;
  validate: () => boolean;
  clear: () => void;
}

export function useMessageAnalysis(initialValue = ''): UseMessageAnalysisReturn {
  const [content, setContent] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    const status = validateMessageInput(content);
    if (!status.isValid) {
      setError(status.error || 'Nội dung không hợp lệ.');
      return false;
    }
    setError(null);
    return true;
  };

  const clear = () => {
    setContent('');
    setError(null);
  };

  return {
    content,
    setContent: (val: string) => {
      setContent(val);
      if (error) setError(null);
    },
    error,
    validate,
    clear,
  };
}
