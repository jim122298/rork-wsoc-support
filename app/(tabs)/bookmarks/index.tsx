import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkX } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useZendesk } from '@/contexts/ZendeskContext';
import { useBookmarks } from '@/contexts/BookmarkContext';
import ArticleCard from '@/components/ArticleCard';

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { bookmarkedIds } = useBookmarks();
  const { articles } = useZendesk();

  const bookmarkedArticles = useMemo(
    () => articles.filter((a) => bookmarkedIds.includes(a.id)),
    [bookmarkedIds, articles]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Articles</Text>
        <Text style={styles.subtitle}>
          {bookmarkedArticles.length} article{bookmarkedArticles.length !== 1 ? 's' : ''} saved
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {bookmarkedArticles.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <BookmarkX size={36} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No saved articles</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on any article to save it for quick access
            </Text>
          </View>
        ) : (
          bookmarkedArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))
        )}
        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
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
  list: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Colors.glassCard,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any
      : {}),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
