export interface Article {
  id: string;
  title: string;
  summary: string;
  category: string;
  categoryId: string;
  sectionId: string;
  url: string;
  htmlUrl: string;
  body: string;
  featured: boolean;
  recent: boolean;
  readTime: string;
  updatedAt: string;
  headerImage: string | null;
  labelNames: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  articleCount: number;
  color: string;
  colorLight: string;
}

export const BASE_URL = 'https://support.wsoc.me/hc/en-us';

export const SECTION_COLORS: Record<string, { color: string; colorLight: string; icon: string }> = {
  default: { color: '#64748B', colorLight: '#F1F5F9', icon: 'FileText' },
};

export const SECTION_ICONS = [
  { color: '#2563EB', colorLight: '#DBEAFE', icon: 'BookOpen' },
  { color: '#7C3AED', colorLight: '#EDE9FE', icon: 'Shield' },
  { color: '#0EA5E9', colorLight: '#E0F2FE', icon: 'Monitor' },
  { color: '#10B981', colorLight: '#D1FAE5', icon: 'FolderOpen' },
  { color: '#F59E0B', colorLight: '#FEF3C7', icon: 'Wrench' },
  { color: '#EC4899', colorLight: '#FCE7F3', icon: 'HelpCircle' },
  { color: '#8B5CF6', colorLight: '#EDE9FE', icon: 'KeyRound' },
  { color: '#06B6D4', colorLight: '#CFFAFE', icon: 'Globe' },
];

export function getSectionStyle(index: number) {
  return SECTION_ICONS[index % SECTION_ICONS.length];
}
