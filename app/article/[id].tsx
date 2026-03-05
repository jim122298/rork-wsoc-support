import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Tag,
  FileText,
  Calendar,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useZendesk } from '@/contexts/ZendeskContext';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { fetchArticleById } from '@/services/zendesk';
import { useQuery } from '@tanstack/react-query';
import HtmlArticleRenderer from '@/components/HtmlArticleRenderer';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getArticleById } = useZendesk();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const cachedArticle = useMemo(() => (id ? getArticleById(id) : undefined), [id, getArticleById]);

  const freshArticleQuery = useQuery({
    queryKey: ['zendesk-article', id],
    queryFn: () => fetchArticleById(Number(id)),
    enabled: !!id && !cachedArticle?.body,
    staleTime: 5 * 60 * 1000,
  });

  const article = cachedArticle;
  const articleBody = cachedArticle?.body || freshArticleQuery.data?.body || '';
  const bookmarked = article ? isBookmarked(article.id) : false;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleOpenInBrowser = useCallback(async () => {
    const url = article?.htmlUrl || article?.url;
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  }, [article?.htmlUrl, article?.url]);

  const handleBookmark = useCallback(() => {
    if (article) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      toggleBookmark(article.id);
    }
  }, [article, toggleBookmark]);

  const formattedDate = useMemo(() => {
    if (!article?.updatedAt) return null;
    const d = new Date(article.updatedAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [article?.updatedAt]);

  if (!article) {
    if (freshArticleQuery.isLoading) {
      return (
        <View style={styles.container}>
          <Stack.Screen options={{ title: 'Loading...' }} />
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading article...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.notFound}>
          <FileText size={48} color={Colors.textTertiary} />
          <Text style={styles.notFoundTitle}>Article not found</Text>
          <Text style={styles.notFoundSubtitle}>This article may have been removed</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={handleBookmark} hitSlop={12} style={styles.headerAction}>
              {bookmarked ? (
                <BookmarkCheck size={22} color={Colors.primary} />
              ) : (
                <Bookmark size={22} color={Colors.textSecondary} />
              )}
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {article.headerImage && (
            <View style={styles.headerImageWrap}>
              <Image
                source={{ uri: article.headerImage }}
                style={styles.headerImage}
                resizeMode="cover"
              />
              <View style={styles.headerImageGlass} />
            </View>
          )}

          <View style={styles.categoryRow}>
            <View style={styles.categoryBadge}>
              <Tag size={12} color={Colors.primary} />
              <Text style={styles.categoryText} numberOfLines={1}>{article.category}</Text>
            </View>
            <View style={styles.readTimeBadge}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.readTimeText}>{article.readTime} read</Text>
            </View>
          </View>

          <Text style={styles.title}>{article.title}</Text>

          {formattedDate && (
            <View style={styles.dateRow}>
              <Calendar size={12} color={Colors.textTertiary} />
              <Text style={styles.dateText}>Updated {formattedDate}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {articleBody ? (
            <View style={styles.bodySection}>
              <HtmlArticleRenderer html={articleBody} />
            </View>
          ) : (
            <View style={styles.contentSection}>
              <Text style={styles.contentText}>{article.summary}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.openButton, pressed && styles.openButtonPressed]}
            onPress={handleOpenInBrowser}
          >
            <View style={styles.openButtonHighlight} />
            <ExternalLink size={18} color="#FFFFFF" />
            <Text style={styles.openButtonText}>View Full Article in Browser</Text>
          </Pressable>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHighlight} />
            <Text style={styles.infoTitle}>Need more help?</Text>
            <Text style={styles.infoText}>
              If this article doesn{"'"}t resolve your issue, contact the IT Help Desk for personalized assistance.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerAction: {
    padding: 4,
  },
  headerImageWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative' as const,
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  headerImageGlass: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: '60%',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  readTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  bodySection: {
    marginBottom: 20,
  },
  contentSection: {
    marginBottom: 24,
  },
  contentText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
  },
  openButton: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  openButtonHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  openButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: Colors.glassCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    overflow: 'hidden',
    position: 'relative' as const,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any
      : {}),
  },
  infoCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: '35%',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 80,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
