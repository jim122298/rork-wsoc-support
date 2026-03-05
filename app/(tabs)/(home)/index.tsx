import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  TicketPlus,
  ClipboardList,
  MessageCircle,
  HelpCircle,
  LogIn,
  ChevronRight,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { BASE_URL } from '@/constants/articles';
import { useZendesk, useZendeskSearch } from '@/contexts/ZendeskContext';
import SearchBar from '@/components/SearchBar';
import ArticleCard from '@/components/ArticleCard';


const SUPPORT_SIGN_IN_URL =
  'https://support.wsoc.me/hc/en-us/signin?return_to=https%3A%2F%2Fsupport.wsoc.me%2Fhc%2Fen-us';

const WEB_LINKS = [
  {
    id: 'paycom',
    title: 'Paycom',
    subtitle: 'HR & Payroll',
    iconUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ea/47/9a/ea479a69-39ce-32fc-87d5-7f0971f0bd34/Placeholder.mill/400x400bb-75.webp',
    webUrl: 'https://www.paycomonline.net/v4/ee/web.php/app/login',
    deepLink: 'paycom://',
    appStoreUrl: 'https://apps.apple.com/us/app/paycom/id1207929487',
  },
  {
    id: 'outlook',
    title: 'Outlook',
    subtitle: 'Email & Calendar',
    iconUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/b4/61/86/b46186d0-4724-2b90-e9c2-0ab091d845c7/Placeholder.mill/400x400bb-75.webp',
    webUrl: 'https://outlook.cloud.microsoft/mail/',
    deepLink: 'ms-outlook://',
    appStoreUrl: 'https://apps.apple.com/us/app/microsoft-outlook/id951937596',
  },
  {
    id: 'sharepoint',
    title: 'SharePoint',
    subtitle: 'Files & Documents',
    iconUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a0/cd/d8/a0cdd882-b3b5-8847-c5e3-c235d9d7b016/SharePointAppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/400x400ia-75.webp',
    webUrl: 'https://woodsorg.sharepoint.com/_layouts/15/sharepoint.aspx',
    deepLink: 'ms-sharepoint://',
    appStoreUrl: 'https://apps.apple.com/us/app/microsoft-sharepoint/id1091505266',
  },
] as const;

async function openAppOrFallback(deepLink: string, webUrl: string, appStoreUrl: string) {
  if (Platform.OS === 'web') {
    Linking.openURL(webUrl);
    return;
  }
  try {
    const supported = await Linking.canOpenURL(deepLink);
    if (supported) {
      await Linking.openURL(deepLink);
    } else {
      await WebBrowser.openBrowserAsync(webUrl);
    }
  } catch {
    console.log('Deep link failed, opening web URL');
    await WebBrowser.openBrowserAsync(webUrl);
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { articles, isLoading, isRefetching, refresh } = useZendesk();
  const { results: searchResults, isSearching } = useZendeskSearch(search);

  const featuredArticles = useMemo(() => {
    const promoted = articles.filter((a) => a.featured);
    if (promoted.length > 0) return promoted.slice(0, 3);
    return articles.slice(0, 3);
  }, [articles]);

  const isSearchMode = search.trim().length > 1;
  const displayResults = isSearchMode ? searchResults : [];

  const handleSubmitTicket = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(BASE_URL + '/requests/new');
  }, []);

  const handleMyTickets = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(BASE_URL + '/requests');
  }, []);

  const handleSignIn = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(SUPPORT_SIGN_IN_URL);
  }, []);

  const handleWebLink = useCallback(
    (item: (typeof WEB_LINKS)[number]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      openAppOrFallback(item.deepLink, item.webUrl, item.appStoreUrl);
    },
    []
  );

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Technical Support</Text>
              <Text style={styles.subtitle}>Woods System of Care</Text>
            </View>
            <View style={styles.logoWrap}>
              <Image
                source={{
                  uri: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzFzbmhqaXAxYnp6aTJuMmZpMXhoenBwZHN5MnA4NjNwOWs5czJ5MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bCO0RUAdNYo4IULnFN/giphy.gif',
                }}
                style={styles.logo}
                resizeMode="contain"
                testID="header-logo"
              />
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <SearchBar value={search} onChangeText={setSearch} />
        </View>

        {isSearchMode ? (
          <View style={styles.section}>
            {isSearching && (
              <View style={styles.searchingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}
            <Text style={styles.sectionTitle}>
              {displayResults.length} result{displayResults.length !== 1 ? 's' : ''}
            </Text>
            {displayResults.length === 0 && !isSearching ? (
              <View style={styles.emptyState}>
                <HelpCircle size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>No articles found</Text>
                <Text style={styles.emptySubtitle}>Try a different search term</Text>
              </View>
            ) : (
              displayResults.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))
            )}
          </View>
        ) : (
          <>
            <Pressable
              onPress={handleSubmitTicket}
              style={({ pressed }) => [
                styles.glassActionCard,
                pressed && styles.glassActionCardPressed,
              ]}
              testID="submit-ticket"
            >
              {({ pressed }) => (
                <>
                  {pressed && <View style={styles.glassActiveTint} />}
                  <View style={[styles.glassIconWrap, { backgroundColor: Colors.primaryLight }]}>
                    <TicketPlus size={21} color={Colors.primary} />
                  </View>
                  <View style={styles.glassCardContent}>
                    <Text style={styles.glassCardTitle}>Submit a Ticket</Text>
                    <Text style={styles.glassCardSubtitle}>Create a new support request</Text>
                  </View>
                  <ArrowRight size={17} color={Colors.textTertiary} />
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/scanner' as any)}
              style={({ pressed }) => [
                styles.glassActionCard,
                pressed && styles.glassActionCardPressed,
              ]}
              testID="ai-solver-btn"
            >
              {({ pressed }) => (
                <>
                  {pressed && <View style={styles.glassActiveTint} />}
                  <View style={[styles.glassIconWrap, { backgroundColor: '#F0E6FA' }]}>
                    <MessageCircle size={21} color={Colors.primary} />
                  </View>
                  <View style={styles.glassCardContent}>
                    <Text style={styles.glassCardTitle}>Support Assistant</Text>
                    <Text style={styles.glassCardSubtitle}>Snap an error & get instant help</Text>
                  </View>
                  <ArrowRight size={17} color={Colors.textTertiary} />
                </>
              )}
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                onPress={handleMyTickets}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
                testID="my-tickets"
              >
                <View style={styles.actionCardHighlight} />
                <View style={[styles.actionIconWrap, { backgroundColor: Colors.successLight }]}>
                  <ClipboardList size={20} color={Colors.success} />
                </View>
                <Text style={styles.actionLabel}>My Tickets</Text>
                <Text style={styles.actionHint}>Track requests</Text>
              </Pressable>
              <Pressable
                onPress={handleSignIn}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
                testID="sign-in"
              >
                <View style={styles.actionCardHighlight} />
                <View style={[styles.actionIconWrap, { backgroundColor: Colors.primaryLight }]}>
                  <LogIn size={20} color={Colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Sign In</Text>
                <Text style={styles.actionHint}>Support portal</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
            <View style={styles.webLinksGroup}>
              <View style={styles.webLinksHighlight} />
              {WEB_LINKS.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <WebLinkRow item={item} onPress={() => handleWebLink(item)} />
                </React.Fragment>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured Articles</Text>
                <Pressable
                  onPress={() => router.push('/categories' as any)}
                  style={styles.seeAllBtn}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                  <ArrowRight size={14} color={Colors.primary} />
                </Pressable>
              </View>
              {isLoading ? (
                <View style={styles.loadingArticles}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading articles...</Text>
                </View>
              ) : (
                featuredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} compact />
                ))
              )}
            </View>
          </>
        )}

        <View style={styles.affiliateSection}>
          <Image
            source={{ uri: 'https://i.postimg.cc/1XbqJM6V/Everyone.png' }}
            style={styles.affiliateImage}
            resizeMode="contain"
          />
          <Text style={styles.affiliateText}>Proudly Affiliated with Woods System of Care</Text>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

interface WebLinkRowProps {
  item: (typeof WEB_LINKS)[number];
  onPress: () => void;
}

const WebLinkRow = React.memo(function WebLinkRow({ item, onPress }: WebLinkRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.webLinkRow, pressed && styles.webLinkRowPressed]}
      testID={`weblink-${item.id}`}
    >
      <Image source={{ uri: item.iconUrl }} style={styles.webLinkIcon} />
      <View style={styles.webLinkContent}>
        <Text style={styles.webLinkTitle}>{item.title}</Text>
        <Text style={styles.webLinkSubtitle}>{item.subtitle}</Text>
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 16,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  logoWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.glassCard,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: '400' as const,
  },
  searchContainer: {
    marginVertical: 16,
  },
  glassActionCard: {
    backgroundColor: Colors.glassCard,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    shadowColor: 'rgba(30, 20, 60, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative' as const,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        } as any
      : {}),
  },
  glassActionCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  glassActiveTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95, 47, 153, 0.07)',
    borderRadius: 20,
  },
  glassIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  glassCardContent: {
    flex: 1,
  },
  glassCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  glassCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.glassCard,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative' as const,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any
      : {}),
  },
  actionCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  actionCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  actionHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center' as const,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  webLinksGroup: {
    backgroundColor: Colors.glassCard,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative' as const,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any
      : {}),
  },
  webLinksHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: '30%',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 0,
  },
  webLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  webLinkRowPressed: {
    backgroundColor: 'rgba(95, 47, 153, 0.04)',
  },
  webLinkIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  webLinkContent: {
    flex: 1,
  },
  webLinkTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  webLinkSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    marginLeft: 68,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  loadingArticles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  searchingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
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
  affiliateSection: {
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 10,
  },
  affiliateImage: {
    width: '100%',
    height: 90,
    marginBottom: 0,
  },
  affiliateText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textAlign: 'center' as const,
    letterSpacing: 0.1,
  },
});
