export * from './analysis';

export type NavTab = 'home' | 'analyze' | 'history' | 'dashboard' | 'about';

export type AnalyzeType = 'text' | 'image' | 'url';

export interface RiskBadgeInfo {
  level: string;
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  iconName: string;
}

export interface TextExample {
  title: string;
  content: string;
  category: string;
}

export interface UrlExample {
  title: string;
  url: string;
  type: 'safe' | 'suspicious';
}
