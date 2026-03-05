const BASE_URL = 'https://archwayprogramshelp.zendesk.com/api/v2/help_center';
const LOCALE = 'en-us';

export interface ZendeskArticle {
  id: number;
  title: string;
  body: string;
  html_url: string;
  section_id: number;
  created_at: string;
  updated_at: string;
  edited_at: string;
  promoted: boolean;
  draft: boolean;
  label_names: string[];
  name: string;
}

export interface ZendeskSection {
  id: number;
  name: string;
  description: string;
  category_id: number;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface ZendeskCategory {
  id: number;
  name: string;
  description: string;
  html_url: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  count: number;
  page: number;
  page_count: number;
  per_page: number;
  next_page: string | null;
  previous_page: string | null;
}

interface ArticlesResponse extends PaginatedResponse {
  articles: ZendeskArticle[];
}

interface SearchResponse extends PaginatedResponse {
  results: ZendeskArticle[];
}

interface SectionsResponse extends PaginatedResponse {
  sections: ZendeskSection[];
}

interface CategoriesResponse extends PaginatedResponse {
  categories: ZendeskCategory[];
}

interface SingleArticleResponse {
  article: ZendeskArticle;
}

async function fetchJson<T>(url: string): Promise<T> {
  console.log('[Zendesk] Fetching:', url);
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('[Zendesk] Error response:', response.status, text);
    throw new Error(`Zendesk API error: ${response.status}`);
  }
  const data = await response.json();
  console.log('[Zendesk] Success:', url);
  return data as T;
}

export async function fetchAllArticles(page = 1, perPage = 100): Promise<ZendeskArticle[]> {
  const url = `${BASE_URL}/${LOCALE}/articles.json?per_page=${perPage}&page=${page}&sort_by=updated_at&sort_order=desc`;
  const data = await fetchJson<ArticlesResponse>(url);
  console.log('[Zendesk] Fetched', data.articles.length, 'articles, total:', data.count);

  let articles = data.articles.filter((a) => !a.draft);

  if (data.next_page && data.page < data.page_count) {
    const moreArticles = await fetchAllArticles(page + 1, perPage);
    articles = [...articles, ...moreArticles];
  }

  return articles;
}

export async function fetchArticleById(id: number): Promise<ZendeskArticle> {
  const url = `${BASE_URL}/articles/${id}.json`;
  const data = await fetchJson<SingleArticleResponse>(url);
  return data.article;
}

export async function fetchSections(): Promise<ZendeskSection[]> {
  const url = `${BASE_URL}/${LOCALE}/sections.json?per_page=100`;
  const data = await fetchJson<SectionsResponse>(url);
  console.log('[Zendesk] Fetched', data.sections.length, 'sections');
  return data.sections;
}

export async function fetchCategories(): Promise<ZendeskCategory[]> {
  const url = `${BASE_URL}/${LOCALE}/categories.json?per_page=100`;
  const data = await fetchJson<CategoriesResponse>(url);
  console.log('[Zendesk] Fetched', data.categories.length, 'categories');
  return data.categories;
}

export async function searchArticles(query: string): Promise<ZendeskArticle[]> {
  if (!query.trim()) return [];
  const encoded = encodeURIComponent(query.trim());
  const url = `${BASE_URL}/articles/search.json?query=${encoded}&per_page=25`;
  const data = await fetchJson<SearchResponse>(url);
  console.log('[Zendesk] Search results for "' + query + '":', data.results.length);
  return data.results.filter((a) => !a.draft);
}

export function extractFirstImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  \u2022 ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function estimateReadTime(html: string): string {
  const text = htmlToPlainText(html);
  const words = text.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min`;
}
