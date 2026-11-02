import { AnalysisResult, SourceType } from '../types/analysis';
import {
  validateAnalysisOutput,
  validateMessageInput,
  validateScreenshotInput,
  validateUrlInput,
} from '../utils/validation';

export interface AnalysisRequestParams {
  sourceType: SourceType;
  inputContent: string;
  imageBase64?: string;
}

/**
 * Core Analysis Service orchestrator.
 * Handles input validation, readiness checking, and output schema validation.
 */
export class AnalysisService {
  /**
   * Validates input parameters according to source type.
   */
  public validateInput(params: AnalysisRequestParams): { isValid: boolean; error?: string } {
    const { sourceType, inputContent } = params;

    switch (sourceType) {
      case 'MESSAGE':
        return validateMessageInput(inputContent);
      case 'SCREENSHOT':
        return validateScreenshotInput(inputContent || params.imageBase64 || null);
      case 'URL':
        return validateUrlInput(inputContent);
      default:
        return { isValid: false, error: 'Loại phương thức phân tích không hợp lệ.' };
    }
  }

  /**
   * Triggers real Gemini Message Analysis via backend API route /api/analyze
   */
  public async analyzeMessage(inputContent: string): Promise<AnalysisResult> {
    const inputValidation = validateMessageInput(inputContent);
    if (!inputValidation.isValid) {
      throw new Error(inputValidation.error || 'Nội dung tin nhắn không hợp lệ.');
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceType: 'MESSAGE',
          inputContent,
        }),
      });

      if (!response.ok) {
        let errMessage = 'Không thể kết nối đến máy chủ phân tích.';
        try {
          const errData = await response.json();
          if (errData?.error) {
            errMessage = errData.error;
          }
        } catch {
          // Fallback message
        }
        throw new Error(errMessage);
      }

      const rawData = await response.json();
      const processed = this.processRawAiResponse(rawData, inputContent, 'MESSAGE');

      if (!processed.isValid || !processed.result) {
        throw new Error(
          processed.errors?.[0] || 'Dữ liệu kết quả không đúng cấu trúc yêu cầu.'
        );
      }

      return processed.result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Đã xảy ra lỗi không xác định trong quá trình phân tích tin nhắn.');
    }
  }
  /**
   * Helper to convert File to base64 string
   */
  public async fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result && result.includes(';base64,')) {
          const parts = result.split(';base64,');
          const mime = parts[0].replace('data:', '');
          resolve({ base64: parts[1], mimeType: mime });
        } else {
          resolve({ base64: result, mimeType: file.type || 'image/png' });
        }
      };
      reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Triggers real Gemini Multimodal Screenshot Analysis via backend API route /api/analyze
   */
  public async analyzeScreenshot(fileOrBase64: File | string, customMimeType?: string): Promise<AnalysisResult> {
    const inputValidation = validateScreenshotInput(fileOrBase64);
    if (!inputValidation.isValid) {
      throw new Error(inputValidation.error || 'Hình ảnh không hợp lệ.');
    }

    let imageBase64 = '';
    let mimeType = customMimeType || 'image/png';
    let fileName = 'Ảnh chụp màn hình';

    if (typeof fileOrBase64 === 'object' && fileOrBase64 instanceof File) {
      fileName = fileOrBase64.name;
      const converted = await this.fileToBase64(fileOrBase64);
      imageBase64 = converted.base64;
      mimeType = converted.mimeType;
    } else if (typeof fileOrBase64 === 'string') {
      imageBase64 = fileOrBase64;
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceType: 'SCREENSHOT',
          imageBase64,
          mimeType,
          inputContent: `Ảnh chụp màn hình: ${fileName}`,
        }),
      });

      if (!response.ok) {
        let errMessage = 'Không thể kết nối đến máy chủ phân tích.';
        try {
          const errData = await response.json();
          if (errData?.error) {
            errMessage = errData.error;
          }
        } catch {
          // Fallback message
        }
        throw new Error(errMessage);
      }

      const rawData = await response.json();
      const processed = this.processRawAiResponse(rawData, `Ảnh chụp màn hình: ${fileName}`, 'SCREENSHOT');

      if (!processed.isValid || !processed.result) {
        throw new Error(
          processed.errors?.[0] || 'Dữ liệu kết quả không đúng cấu trúc yêu cầu.'
        );
      }

      return processed.result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Đã xảy ra lỗi không xác định trong quá trình phân tích ảnh chụp màn hình.');
    }
  }

  /**
   * Triggers real Gemini URL Structural Analysis via backend API route /api/analyze
   */
  public async analyzeUrl(inputContent: string): Promise<AnalysisResult> {
    const inputValidation = validateUrlInput(inputContent);
    if (!inputValidation.isValid) {
      throw new Error(inputValidation.error || 'Địa chỉ URL không hợp lệ.');
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceType: 'URL',
          inputContent: inputContent.trim(),
        }),
      });

      if (!response.ok) {
        let errMessage = 'Không thể kết nối đến máy chủ phân tích.';
        try {
          const errData = await response.json();
          if (errData?.error) {
            errMessage = errData.error;
          }
        } catch {
          // Fallback message
        }
        throw new Error(errMessage);
      }

      const rawData = await response.json();
      const processed = this.processRawAiResponse(rawData, inputContent.trim(), 'URL');

      if (!processed.isValid || !processed.result) {
        throw new Error(
          processed.errors?.[0] || 'Dữ liệu kết quả không đúng cấu trúc yêu cầu.'
        );
      }

      return processed.result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Đã xảy ra lỗi không xác định trong quá trình phân tích URL.');
    }
  }

  public processRawAiResponse(
    rawResponse: unknown,
    inputContent: string,
    sourceType: SourceType
  ): { isValid: boolean; result?: AnalysisResult; errors?: string[] } {
    const validation = validateAnalysisOutput(rawResponse, inputContent, sourceType);

    if (!validation.isValid || !validation.data) {
      return {
        isValid: false,
        errors: validation.errors || ['Cấu trúc phản hồi không đạt chuẩn bảo mật.'],
      };
    }

    return {
      isValid: true,
      result: validation.data,
    };
  }
}

export const analysisService = new AnalysisService();
