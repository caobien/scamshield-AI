import { useState } from 'react';
import { parseUrl, ParsedUrlResult } from '../../utils/urlParser';
import { validateUrlInput } from '../../utils/validation';

export interface UseUrlAnalysisReturn {
  rawUrl: string;
  setRawUrl: (val: string) => void;
  parsedResult: ParsedUrlResult | null;
  error: string | null;
  validate: () => boolean;
  clear: () => void;
}

export function useUrlAnalysis(initialUrl = ''): UseUrlAnalysisReturn {
  const [rawUrl, setRawUrl] = useState(initialUrl);
  const [parsedResult, setParsedResult] = useState<ParsedUrlResult | null>(
    initialUrl ? parseUrl(initialUrl) : null
  );
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (val: string) => {
    setRawUrl(val);
    if (val.trim()) {
      const parsed = parseUrl(val);
      setParsedResult(parsed);
    } else {
      setParsedResult(null);
    }
    if (error) setError(null);
  };

  const validate = (): boolean => {
    const status = validateUrlInput(rawUrl);
    if (!status.isValid) {
      setError(status.error || 'Địa chỉ URL không hợp lệ.');
      return false;
    }
    setError(null);
    return true;
  };

  const clear = () => {
    setRawUrl('');
    setParsedResult(null);
    setError(null);
  };

  return {
    rawUrl,
    setRawUrl: handleUrlChange,
    parsedResult,
    error,
    validate,
    clear,
  };
}
