import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  Shield,
  Monitor,
  FolderOpen,
  Wrench,
  HelpCircle,
  KeyRound,
  Globe,
  FileText,
  Check,
  RefreshCw,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useZendesk, useZendeskSearch } from '@/contexts/ZendeskContext';
import SearchBar from '@/components/SearchBar';
import ArticleCard from '@/components/ArticleCard';

const BANNER_IMAGE = 'https://i.postimg.cc/3wB71Rpy/WSOCcc.png';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  BookOpen,
  Shield,
  Monitor,
  FolderOpen,
  Wrench,
  HelpCircle,
  KeyRound,
  Globe,
  FileText,
};

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [activeCategory, setActiveCategory] = useState<string | null>(params.filter ?? null);
  const [search, setSearch] = useState('');
  const { articles, sections, isLoading, isRefetching, refresh } = useZendesk();
  const { results: searchResults, isSearching } = useZendeskSearch(search);

  const isSearchMode = search.trim().length > 1;

  const filteredArticles = useMemo(() => {
    if (isSearchMode) return searchResults;
    let result = articles;
    if (activeCategory) {
      result = result.filter((a) => a.categoryId === activeCategory);
    }
    return result;
  }, [activeCategory, articles, isSearchMode, searchResults]);

  const handleCategoryPress = useCallback((categoryId: string) => {
    setActiveCategory((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bannerWrap}>
        <Image
          source={{ uri: BANNER_IMAGE }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        <View style={styles.bannerGlassOverlay} />
      </View>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Browse Articles</Text>
            <Text style={styles.subtitle}>
              {isLoading ? 'Loading...' : `${articles.length} help articles available`}
            </Text>
          </View>
          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
            testID="refresh-btn"
          >
            <RefreshCw size={18} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search articles..." />
      </View>

      {!isSearchMode && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {sections.map((cat) => {
            const isActive = activeCategory === cat.id;
            const IconComp = iconMap[cat.icon] || FileText;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleCategoryPress(cat.id)}
                style={[
                  styles.chip,
                  isActive && { backgroundColor: cat.color, borderColor: cat.color },
                ]}
                testID={`chip-${cat.id}`}
              >
                {isActive ? (
                  <Check size={14} color="#FFFFFF" />
                ) : (
                  <IconComp size={14} color={cat.color} />
                )}
                <Text
                  style={[styles.chipText, isActive && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.articleList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {isSearchMode && isSearching && (
            <View style={styles.searchingIndicator}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          )}

          {filteredArticles.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <HelpCircle size={36} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No articles found</Text>
              <Text style={styles.emptySubtitle}>
                {isSearchMode ? 'Try a different search term' : 'Try adjusting your filters'}
              </Text>
            </View>
          ) : (
            filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    position: 'relative' as const,
  },
  bannerImage: {
    width: '100%',
    height: 130,
    borderRadius: 20,
  },
  bannerGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.glassCard,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  refreshBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  searchWrap: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  chipScroll: {
    marginTop: 14,
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    height: 36,
    backgroundColor: Colors.glassCard,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        } as any
      : {}),
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  articleList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  searchingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.glassCard,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
