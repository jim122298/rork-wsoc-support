import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Globe,
  MessageCircle,
  Info,
  ChevronRight,
  Shield,
  TicketPlus,
  ClipboardList,
  Download,
  Sparkles,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/colors';
import { BASE_URL } from '@/constants/articles';

const RECOMMENDED_APPS = [
  {
    id: 'outlook',
    title: 'Microsoft Outlook',
    subtitle: 'Email, calendar & contacts',
    iconUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/b4/61/86/b46186d0-4724-2b90-e9c2-0ab091d845c7/Placeholder.mill/400x400bb-75.webp',
    appStoreUrl: 'https://apps.apple.com/us/app/microsoft-outlook/id951937596',
  },
  {
    id: 'paycom',
    title: 'Paycom',
    subtitle: 'HR, payroll & time tracking',
    iconUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ea/47/9a/ea479a69-39ce-32fc-87d5-7f0971f0bd34/Placeholder.mill/400x400bb-75.webp',
    appStoreUrl: 'https://apps.apple.com/us/app/paycom/id1207929487',
  },
  {
    id: 'sharepoint',
    title: 'Microsoft SharePoint',
    subtitle: 'Files, sites & collaboration',
    iconUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a0/cd/d8/a0cdd882-b3b5-8847-c5e3-c235d9d7b016/SharePointAppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/400x400ia-75.webp',
    appStoreUrl: 'https://apps.apple.com/us/app/microsoft-sharepoint/id1091505266',
  },
] as const;

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
}

function SettingsRow({ icon, title, subtitle, onPress, color }: SettingsRowProps) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: color ? color + '18' : Colors.primaryLight }]}>
        {icon}
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const openPortal = useCallback(async () => {
    await WebBrowser.openBrowserAsync(BASE_URL);
  }, []);

  const openCommunity = useCallback(async () => {
    await WebBrowser.openBrowserAsync(BASE_URL + '/community/posts');
  }, []);

  const openEmail = useCallback(() => {
    Linking.openURL('mailto:support@wsoc.me');
  }, []);

  const openSubmitTicket = useCallback(async () => {
    await WebBrowser.openBrowserAsync(BASE_URL + '/requests/new');
  }, []);

  const openMyTickets = useCallback(async () => {
    await WebBrowser.openBrowserAsync(BASE_URL + '/requests');
  }, []);

  const openAppStore = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>TICKETS</Text>
        <View style={styles.group}>
          <View style={styles.groupHighlight} />
          <SettingsRow
            icon={<TicketPlus size={20} color={Colors.primary} />}
            title="Submit a Ticket"
            subtitle="Create a new support request"
            onPress={openSubmitTicket}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<ClipboardList size={20} color={Colors.success} />}
            title="My Tickets"
            subtitle="View and track your open requests"
            onPress={openMyTickets}
            color={Colors.success}
          />
        </View>

        <Text style={styles.sectionLabel}>RECOMMENDED APPS</Text>
        <View style={styles.group}>
          <View style={styles.groupHighlight} />
          {RECOMMENDED_APPS.map((app, idx) => (
            <React.Fragment key={app.id}>
              {idx > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [styles.appRow, pressed && styles.rowPressed]}
                onPress={() => openAppStore(app.appStoreUrl)}
              >
                <Image source={{ uri: app.iconUrl }} style={styles.appIcon} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{app.title}</Text>
                  <Text style={styles.rowSubtitle}>{app.subtitle}</Text>
                </View>
                <View style={styles.getBtn}>
                  <Download size={14} color={Colors.primary} />
                  <Text style={styles.getBtnText}>GET</Text>
                </View>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.group}>
          <View style={styles.groupHighlight} />
          <SettingsRow
            icon={<Globe size={20} color={Colors.primary} />}
            title="Support Portal"
            subtitle="Open the full help center website"
            onPress={openPortal}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<MessageCircle size={20} color={Colors.outlook} />}
            title="Community"
            subtitle="Join discussions and share solutions"
            onPress={openCommunity}
            color={Colors.outlook}
          />
        </View>

        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        <View style={styles.group}>
          <View style={styles.groupHighlight} />
          <SettingsRow
            icon={<Sparkles size={20} color={Colors.primary} />}
            title="Full Support Portal"
            subtitle="Open support.wsoc.me"
            onPress={openPortal}
          />
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.group}>
          <View style={styles.groupHighlight} />
          <SettingsRow
            icon={<Shield size={20} color={Colors.primary} />}
            title="Privacy & Security"
            subtitle="Data routed through secure backend endpoints"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Info size={20} color={Colors.textSecondary} />}
            title="About"
            subtitle="WSOC Technical Support v3.0"
            onPress={() => {}}
            color={Colors.textSecondary}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Woods System of Care</Text>
          <Text style={styles.footerVersion}>Technical Support v3.0</Text>
        </View>

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
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.6,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },
  group: {
    backgroundColor: Colors.glassCard,
    borderRadius: 18,
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
  groupHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: '25%',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: 'rgba(95, 47, 153, 0.04)',
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    marginLeft: 68,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  appIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  getBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  getBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  footerVersion: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
