import { useState } from 'react';
import { validateScreenshotInput } from '../../utils/validation';

export interface UseScreenshotAnalysisReturn {
  file: File | null;
  previewUrl: string | null;
  error: string | null;
  handleFileSelect: (file: File) => boolean;
  validate: () => boolean;
  clear: () => void;
}

export function useScreenshotAnalysis(): UseScreenshotAnalysisReturn {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File): boolean => {
    const status = validateScreenshotInput(selectedFile);
    if (!status.isValid) {
      setError(status.error || 'Tập tin ảnh không hợp lệ.');
      return false;
    }

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
    return true;
  };

  const validate = (): boolean => {
    const status = validateScreenshotInput(file || previewUrl);
    if (!status.isValid) {
      setError(status.error || 'Chưa chọn ảnh chụp màn hình.');
      return false;
    }
    setError(null);
    return true;
  };

  const clear = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  return {
    file,
    previewUrl,
    error,
    handleFileSelect,
    validate,
    clear,
  };
}
