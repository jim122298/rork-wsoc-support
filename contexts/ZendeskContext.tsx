import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  fetchAllArticles,
  fetchSections,
  fetchCategories,
  searchArticles,
  ZendeskArticle,
  ZendeskSection,
  ZendeskCategory,
  htmlToPlainText,
  estimateReadTime,
  extractFirstImage,
} from '@/services/zendesk';
import { Article, Category, getSectionStyle } from '@/constants/articles';

function mapZendeskArticle(
  za: ZendeskArticle,
  sectionsMap: Map<number, ZendeskSection>,
): Article {
  const section = sectionsMap.get(za.section_id);
  const sectionName = section ? section.name : 'General';
  const plainText = htmlToPlainText(za.body || '');
  const summaryText = plainText.length > 200 ? plainText.slice(0, 200) + '...' : plainText;
  const now = Date.now();
  const updatedMs = new Date(za.updated_at).getTime();
  const isRecent = now - updatedMs < 30 * 24 * 60 * 60 * 1000;

  return {
    id: String(za.id),
    title: za.title,
    summary: summaryText,
    category: sectionName,
    categoryId: String(za.section_id),
    sectionId: String(za.section_id),
    url: za.html_url,
    htmlUrl: za.html_url,
    body: za.body || '',
    featured: za.promoted,
    recent: isRecent,
    readTime: estimateReadTime(za.body || ''),
    updatedAt: za.updated_at,
    headerImage: extractFirstImage(za.body || ''),
    labelNames: za.label_names || [],
  };
}

function mapSectionToCategory(
  section: ZendeskSection,
  index: number,
  articleCounts: Map<string, number>,
): Category {
  const style = getSectionStyle(index);
  return {
    id: String(section.id),
    name: section.name.trim(),
    icon: style.icon,
    description: section.description || '',
    articleCount: articleCounts.get(String(section.id)) || 0,
    color: style.color,
    colorLight: style.colorLight,
  };
}

export const [ZendeskProvider, useZendesk] = createContextHook(() => {
  const queryClient = useQueryClient();

  const articlesQuery = useQuery({
    queryKey: ['zendesk-articles'],
    queryFn: () => fetchAllArticles(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const sectionsQuery = useQuery({
    queryKey: ['zendesk-sections'],
    queryFn: fetchSections,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['zendesk-categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const sectionsMap = useMemo(() => {
    const map = new Map<number, ZendeskSection>();
    if (sectionsQuery.data) {
      sectionsQuery.data.forEach((s) => map.set(s.id, s));
    }
    return map;
  }, [sectionsQuery.data]);

  const articles = useMemo<Article[]>(() => {
    if (!articlesQuery.data) return [];
    return articlesQuery.data.map((za) => mapZendeskArticle(za, sectionsMap));
  }, [articlesQuery.data, sectionsMap]);

  const articleCountsBySection = useMemo(() => {
    const counts = new Map<string, number>();
    articles.forEach((a) => {
      const current = counts.get(a.categoryId) || 0;
      counts.set(a.categoryId, current + 1);
    });
    return counts;
  }, [articles]);

  const sections = useMemo<Category[]>(() => {
    if (!sectionsQuery.data) return [];
    return sectionsQuery.data.map((s, i) =>
      mapSectionToCategory(s, i, articleCountsBySection)
    );
  }, [sectionsQuery.data, articleCountsBySection]);

  const isLoading = articlesQuery.isLoading || sectionsQuery.isLoading;
  const isError = articlesQuery.isError || sectionsQuery.isError;
  const isRefetching = articlesQuery.isRefetching || sectionsQuery.isRefetching;

  const refresh = useCallback(async () => {
    console.log('[Zendesk] Refreshing all data...');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['zendesk-articles'] }),
      queryClient.invalidateQueries({ queryKey: ['zendesk-sections'] }),
      queryClient.invalidateQueries({ queryKey: ['zendesk-categories'] }),
    ]);
  }, [queryClient]);

  const getArticleById = useCallback(
    (id: string): Article | undefined => {
      return articles.find((a) => a.id === id);
    },
    [articles]
  );

  return {
    articles,
    sections,
    zendeskCategories: categoriesQuery.data || [],
    isLoading,
    isError,
    isRefetching,
    refresh,
    getArticleById,
  };
});

export function useZendeskSearch(query: string) {
  const searchQuery = useQuery<ZendeskArticle[]>({
    queryKey: ['zendesk-search', query],
    queryFn: () => searchArticles(query),
    enabled: query.trim().length > 1,
    staleTime: 2 * 60 * 1000,
  });

  const { sections } = useZendesk();

  const results = useMemo<Article[]>(() => {
    if (!searchQuery.data) return [];
    const zendeskSectionsMap = new Map<number, ZendeskSection>();
    sections.forEach((s) => {
      zendeskSectionsMap.set(Number(s.id), {
        id: Number(s.id),
        name: s.name,
        description: s.description,
        category_id: 0,
        html_url: '',
        created_at: '',
        updated_at: '',
      });
    });
    return searchQuery.data.map((za: ZendeskArticle) => mapZendeskArticle(za, zendeskSectionsMap));
  }, [searchQuery.data, sections]);

  return {
    results,
    isSearching: searchQuery.isFetching,
    isError: searchQuery.isError,
  };
}
