/**
 * src/types/stateMachine.ts
 * Explicit State Machine types for Analysis Session.
 *
 * States:
 * idle -> validating -> analyzing -> validating_result -> success | error | timeout | cancelled
 */

export type AnalysisStatus =
  | 'idle'
  | 'validating'
  | 'analyzing'
  | 'validating_result'
  | 'success'
  | 'error'
  | 'timeout'
  | 'cancelled';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

export const DYNAMIC_PROGRESS_STEPS: Array<{ label: string; minTimeMs: number }> = [
  { label: 'Đang kiểm tra dữ liệu đầu vào', minTimeMs: 0 },
  { label: 'Đang nhận diện dấu hiệu đáng ngờ', minTimeMs: 600 },
  { label: 'Đang đánh giá mức rủi ro', minTimeMs: 1400 },
  { label: 'Đang tạo khuyến nghị an toàn', minTimeMs: 2200 },
];
