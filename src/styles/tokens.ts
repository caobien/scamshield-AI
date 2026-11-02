/**
 * src/styles/tokens.ts
 * Strongly typed design token mappings for ScamShield AI.
 *
 * Source of truth for visual tokens across views and components.
 */

export const DESIGN_TOKENS = {
  colors: {
    bgApp: 'var(--color-bg-app)',
    surface: 'var(--color-surface)',
    surfaceElevated: 'var(--color-surface-elevated)',
    surfaceSubtle: 'var(--color-surface-subtle)',
    surfaceHover: 'var(--color-surface-hover)',
    textPrimary: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    textMuted: 'var(--color-text-muted)',
    textInverse: 'var(--color-text-inverse)',
    borderDefault: 'var(--color-border-default)',
    borderSubtle: 'var(--color-border-subtle)',
    borderStrong: 'var(--color-border-strong)',
    borderFocus: 'var(--color-border-focus)',
    brandPrimary: 'var(--color-brand-primary)',
    brandHover: 'var(--color-brand-hover)',
    brandLight: 'var(--color-brand-light)',
  },
  riskLevels: {
    LOW: {
      bg: 'var(--color-risk-low-bg)',
      text: 'var(--color-risk-low-text)',
      border: 'var(--color-risk-low-border)',
      badge: 'var(--color-risk-low-badge)',
      icon: 'var(--color-risk-low-icon)',
      label: 'Thấp (An toàn)',
    },
    MEDIUM: {
      bg: 'var(--color-risk-medium-bg)',
      text: 'var(--color-risk-medium-text)',
      border: 'var(--color-risk-medium-border)',
      badge: 'var(--color-risk-medium-badge)',
      icon: 'var(--color-risk-medium-icon)',
      label: 'Trung bình (Cần kiểm tra)',
    },
    HIGH: {
      bg: 'var(--color-risk-high-bg)',
      text: 'var(--color-risk-high-text)',
      border: 'var(--color-risk-high-border)',
      badge: 'var(--color-risk-high-badge)',
      icon: 'var(--color-risk-high-icon)',
      label: 'Cao (Nghi vấn lừa đảo)',
    },
    CRITICAL: {
      bg: 'var(--color-risk-critical-bg)',
      text: 'var(--color-risk-critical-text)',
      border: 'var(--color-risk-critical-border)',
      badge: 'var(--color-risk-critical-badge)',
      icon: 'var(--color-risk-critical-icon)',
      label: 'Rất cao (Nguy hiểm)',
    },
    UNKNOWN: {
      bg: 'var(--color-risk-unknown-bg)',
      text: 'var(--color-risk-unknown-text)',
      border: 'var(--color-risk-unknown-border)',
      badge: 'var(--color-risk-unknown-badge)',
      icon: 'var(--color-risk-unknown-icon)',
      label: 'Chưa xác định',
    },
  },
} as const;

export type RiskTokenType = keyof typeof DESIGN_TOKENS.riskLevels;
