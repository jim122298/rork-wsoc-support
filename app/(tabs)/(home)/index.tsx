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
  Sparkles,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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

  const handleWebLink = useCallback((item: (typeof WEB_LINKS)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openAppOrFallback(item.deepLink, item.webUrl, item.appStoreUrl);
  }, []);

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
        <LinearGradient
          colors={['rgba(95,47,153,0.12)', 'rgba(95,47,153,0.04)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Sparkles size={13} color={Colors.primary} />
              <Text style={styles.heroBadgeText}>WSOC Support</Text>
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

          <Text style={styles.heroTitle}>Technical Support</Text>
          <Text style={styles.heroSubtitle}>
            Search help articles, open support tools, and get instant assistance.
          </Text>
        </LinearGradient>

        <View style={styles.searchContainer}>
          <SearchBar value={search} onChangeText={setSearch} />
        </View>

        {isSearchMode ? (
          <View style={styles.section}>
            {isSearching && (
              <View style={styles.searchingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.searchingText}>Searching articles...</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>
              {displayResults.length} result{displayResults.length !== 1 ? 's' : ''}
            </Text>

            {displayResults.length === 0 && !isSearching ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <HelpCircle size={36} color={Colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>No articles found</Text>
                <Text style={styles.emptySubtitle}>Try another keyword or phrase</Text>
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
              style={({ pressed }) => [styles.primaryActionCard, pressed && styles.cardPressed]}
              testID="submit-ticket"
            >
              <View style={styles.primaryActionIcon}>
                <TicketPlus size={22} color={Colors.primary} />
              </View>
              <View style={styles.primaryActionContent}>
                <Text style={styles.primaryActionTitle}>Submit a Ticket</Text>
                <Text style={styles.primaryActionSubtitle}>Create a new support request</Text>
              </View>
              <ArrowRight size={18} color={Colors.textTertiary} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/scanner' as any)}
              style={({ pressed }) => [styles.primaryActionCard, pressed && styles.cardPressed]}
              testID="ai-solver-btn"
            >
              <View style={[styles.primaryActionIcon, { backgroundColor: '#F2EAFE' }]}>
                <MessageCircle size={22} color={Colors.primary} />
              </View>
              <View style={styles.primaryActionContent}>
                <Text style={styles.primaryActionTitle}>Support Assistant</Text>
                <Text style={styles.primaryActionSubtitle}>Snap an error and get guided help</Text>
              </View>
              <ArrowRight size={18} color={Colors.textTertiary} />
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                onPress={handleMyTickets}
                style={({ pressed }) => [styles.miniCard, pressed && styles.cardPressed]}
                testID="my-tickets"
              >
                <View style={[styles.miniIconWrap, { backgroundColor: Colors.successLight }]}>
                  <ClipboardList size={20} color={Colors.success} />
                </View>
                <Text style={styles.miniCardTitle}>My Tickets</Text>
                <Text style={styles.miniCardSubtitle}>Track requests</Text>
              </Pressable>

              <Pressable
                onPress={handleSignIn}
                style={({ pressed }) => [styles.miniCard, pressed && styles.cardPressed]}
                testID="sign-in"
              >
                <View style={[styles.miniIconWrap, { backgroundColor: Colors.primaryLight }]}>
                  <LogIn size={20} color={Colors.primary} />
                </View>
                <Text style={styles.miniCardTitle}>Sign In</Text>
                <Text style={styles.miniCardSubtitle}>Support portal</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Quick Access</Text>
            </View>

            <View style={styles.webLinksGroup}>
              {WEB_LINKS.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <WebLinkRow item={item} onPress={() => handleWebLink(item)} />
                </React.Fragment>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Featured Articles</Text>
                <Pressable onPress={() => router.push('/categories' as any)} style={styles.seeAllBtn}>
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
          <Text style={styles.affiliateText}>Proudly affiliated with Woods System of Care</Text>
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
      <View style={styles.webLinkLeft}>
        <Image source={{ uri: item.iconUrl }} style={styles.webLinkIcon} />
        <View style={styles.webLinkContent}>
          <Text style={styles.webLinkTitle}>{item.title}</Text>
          <Text style={styles.webLinkSubtitle}>{item.subtitle}</Text>
        </View>
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
    paddingBottom: 10,
  },

  heroCard: {
    marginTop: 16,
    marginBottom: 10,
    padding: 20,
    borderRadius: 28,
    backgroundColor: Colors.glassCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: 'rgba(30, 20, 60, 0.10)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden',
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },

  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  heroTitle: {
    marginTop: 16,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: Colors.text,
  },

  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    maxWidth: '92%',
  },

  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  logo: {
    width: 54,
    height: 54,
    borderRadius: 16,
  },

  searchContainer: {
    marginVertical: 14,
  },

  primaryActionCard: {
    backgroundColor: Colors.glassCard,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowColor: 'rgba(30,20,60,0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },

  primaryActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: Colors.primaryLight,
  },

  primaryActionContent: {
    flex: 1,
  },

  primaryActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  primaryActionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
    marginTop: 2,
  },

  miniCard: {
    flex: 1,
    backgroundColor: Colors.glassCard,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowColor: 'rgba(30,20,60,0.07)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
  },

  miniIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  miniCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },

  miniCardSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },

  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },

  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 2,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },

  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  webLinksGroup: {
    backgroundColor: Colors.glassCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    overflow: 'hidden',
    marginBottom: 26,
    shadowColor: 'rgba(30,20,60,0.07)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
  },

  webLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  webLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  webLinkRowPressed: {
    backgroundColor: 'rgba(95,47,153,0.05)',
  },

  webLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginRight: 12,
  },

  webLinkContent: {
    flex: 1,
  },

  webLinkTitle: {
    fontSize: 15,
    fontWeight: '700',
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
    marginLeft: 70,
  },

  loadingArticles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 26,
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
    paddingVertical: 10,
  },

  searchingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 42,
  },

  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.glassCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  affiliateSection: {
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
  },

  affiliateImage: {
    width: '100%',
    height: 92,
    marginBottom: 2,
  },

  affiliateText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 0.15,
  },
});