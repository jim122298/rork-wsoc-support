import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Bookmark, BookmarkCheck, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Article } from '@/constants/articles';
import { useBookmarks } from '@/contexts/BookmarkContext';
import * as Haptics from 'expo-haptics';

interface ArticleCardProps {
  article: Article;
  compact?: boolean;
}

export default React.memo(function ArticleCard({ article, compact = false }: ArticleCardProps) {
  const router = useRouter();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(article.id);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    router.push(`/article/${article.id}` as any);
  }, [article.id, router, scaleAnim]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(article.id);
  }, [article.id, toggleBookmark]);

  const updatedLabel = article.updatedAt
    ? formatRelativeDate(article.updatedAt)
    : null;

  if (compact) {
    return (
      <Pressable onPress={handlePress} testID={`article-card-${article.id}`}>
        <Animated.View style={[styles.compactCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.compactContent}>
            <Text style={styles.compactTitle} numberOfLines={2}>{article.title}</Text>
            <View style={styles.compactMeta}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{article.readTime}</Text>
              <View style={[styles.categoryDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.metaText} numberOfLines={1}>{article.category}</Text>
            </View>
          </View>
          <ChevronRight size={16} color={Colors.textTertiary} />
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} testID={`article-card-${article.id}`}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.cardGlassHighlight} />
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText} numberOfLines={1}>{article.category}</Text>
          </View>
          <Pressable onPress={handleBookmark} hitSlop={12} testID={`bookmark-${article.id}`}>
            {bookmarked ? (
              <BookmarkCheck size={20} color={Colors.primary} />
            ) : (
              <Bookmark size={20} color={Colors.textTertiary} />
            )}
          </Pressable>
        </View>
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.summary} numberOfLines={2}>{article.summary}</Text>
        <View style={styles.footer}>
          <View style={styles.readTime}>
            <Clock size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{article.readTime} read</Text>
            {updatedLabel && (
              <>
                <View style={[styles.categoryDot, { backgroundColor: Colors.textTertiary }]} />
                <Text style={styles.metaText}>{updatedLabel}</Text>
              </>
            )}
          </View>
          <ChevronRight size={16} color={Colors.textTertiary} />
        </View>
      </Animated.View>
    </Pressable>
  );
});

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassCard,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any
      : {}),
  },
  cardGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: '35%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: '70%' as const,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  summary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  compactCard: {
    backgroundColor: Colors.glassCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        } as any
      : {}),
  },
  compactContent: {
    flex: 1,
    marginRight: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
