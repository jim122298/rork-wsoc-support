import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const BOOKMARKS_KEY = 'wsoc_bookmarks';

export const [BookmarkProvider, useBookmarks] = createContextHook(() => {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const bookmarksQuery = useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BOOKMARKS_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids));
      return ids;
    },
  });

  const syncMutationRef = useRef(syncMutation);
  syncMutationRef.current = syncMutation;

  useEffect(() => {
    if (bookmarksQuery.data) {
      setBookmarkedIds(bookmarksQuery.data);
    }
  }, [bookmarksQuery.data]);

  const toggleBookmark = useCallback((articleId: string) => {
    setBookmarkedIds((prev) => {
      const updated = prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId];
      syncMutationRef.current.mutate(updated);
      return updated;
    });
  }, []);

  const isBookmarked = useCallback(
    (articleId: string) => bookmarkedIds.includes(articleId),
    [bookmarkedIds]
  );

  return {
    bookmarkedIds,
    toggleBookmark,
    isBookmarked,
    isLoading: bookmarksQuery.isLoading,
  };
});
