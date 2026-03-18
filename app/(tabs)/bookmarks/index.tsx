import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
            <Image
              source={{ uri: 'https://raw.githubusercontent.com/jim122298/WSOC-App-Assets/main/PNG%20Clip%20Art/wsoc_branded_headphones.png' }}
              style={styles.emptyArt}
              resizeMode="contain"
            />
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
    paddingVertical: 40,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyArt: {
    width: 180,
    height: 180,
    marginBottom: 8,
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
