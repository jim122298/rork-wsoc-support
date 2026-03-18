import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
  Animated,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  MessageSquare,
  X,
  ArrowRight,
} from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import {
  MOCK_SERVICES,
  ServiceInfo,
  ServiceStatusType,
  getStatusColor,
  getStatusLabel,
  getOverallStatus,
} from '@/constants/serviceStatus';

type LoadState = 'loading' | 'success' | 'error' | 'empty';

function StatusIcon({ status, size = 16 }: { status: ServiceStatusType; size?: number }) {
  const color = getStatusColor(status);
  switch (status) {
    case 'operational':
      return <CheckCircle size={size} color={color} />;
    case 'degraded':
      return <AlertTriangle size={size} color={color} />;
    case 'down':
      return <XCircle size={size} color={color} />;
  }
}

function StatusPill({ status }: { status: ServiceStatusType }) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const bgMap: Record<ServiceStatusType, string> = {
    operational: 'rgba(52, 199, 89, 0.12)',
    degraded: 'rgba(255, 149, 0, 0.12)',
    down: 'rgba(255, 59, 48, 0.12)',
  };

  return (
    <View style={[styles.pill, { backgroundColor: bgMap[status] }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function ServiceCard({
  service,
  onPress,
  index,
}: {
  service: ServiceInfo;
  onPress: () => void;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}
        testID={`service-card-${service.id}`}
      >
        <View style={styles.cardHeader}>
          <Image source={{ uri: service.iconUrl }} style={styles.serviceIcon} />
          <View style={styles.cardTitleArea}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <StatusPill status={service.status} />
          </View>
        </View>

        <View style={styles.cardMetrics}>
          <View style={styles.metricItem}>
            <Zap size={13} color={Colors.textTertiary} />
            <Text style={styles.metricValue}>
              {service.responseTime > 0 ? `${service.responseTime}ms` : '—'}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <Text style={styles.cardNote} numberOfLines={1}>
            {service.note}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ServiceDetailModal({
  service,
  visible,
  onClose,
}: {
  service: ServiceInfo | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!service) return null;

  const statusColor = getStatusColor(service.status);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHandle} />
        <Pressable
          style={styles.modalClose}
          onPress={onClose}
          hitSlop={16}
          testID="close-detail-modal"
        >
          <X size={20} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.modalContent}>
          <Image source={{ uri: service.iconUrl }} style={styles.detailIcon} />
          <Text style={styles.detailName}>{service.name}</Text>
          <StatusPill status={service.status} />

          <View style={styles.detailCards}>
            <View style={styles.detailCard}>
              <View style={styles.detailCardIcon}>
                <StatusIcon status={service.status} size={20} />
              </View>
              <Text style={styles.detailCardLabel}>Current Status</Text>
              <Text style={[styles.detailCardValue, { color: statusColor }]}>
                {getStatusLabel(service.status)}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailCardIcon}>
                <Zap size={20} color={Colors.primary} />
              </View>
              <Text style={styles.detailCardLabel}>Response Time</Text>
              <Text style={styles.detailCardValue}>
                {service.responseTime > 0 ? `${service.responseTime}ms` : 'Unreachable'}
              </Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailSectionHeader}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.detailSectionTitle}>Last Incident</Text>
            </View>
            <Text style={styles.detailSectionBody}>{service.lastIncident}</Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailSectionHeader}>
              <MessageSquare size={16} color={Colors.textSecondary} />
              <Text style={styles.detailSectionTitle}>Recommended Action</Text>
            </View>
            <View style={styles.actionRow}>
              <ArrowRight size={14} color={Colors.primary} />
              <Text style={styles.detailActionText}>{service.recommendedAction}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ServiceStatusScreen() {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [lastChecked, setLastChecked] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const fetchServices = useCallback(async () => {
    console.log('[ServiceStatus] Fetching service status...');
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const data = MOCK_SERVICES;
      if (data.length === 0) {
        setLoadState('empty');
        setServices([]);
      } else {
        setServices(data);
        setLoadState('success');
      }

      const now = new Date();
      setLastChecked(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
          ' · ' +
          now.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
      console.log('[ServiceStatus] Loaded', data.length, 'services');
    } catch (err) {
      console.error('[ServiceStatus] Error fetching:', err);
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  }, [fetchServices]);

  const handleRetry = useCallback(() => {
    setLoadState('loading');
    void fetchServices();
  }, [fetchServices]);

  const openDetail = useCallback((service: ServiceInfo) => {
    setSelectedService(service);
    setModalVisible(true);
  }, []);

  const closeDetail = useCallback(() => {
    setModalVisible(false);
    void new Promise<void>((resolve) => setTimeout(() => { setSelectedService(null); resolve(); }, 300));
  }, []);

  const overall = getOverallStatus(services);

  const operationalCount = services.filter((s) => s.status === 'operational').length;
  const issueCount = services.length - operationalCount;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Service Status',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            color: Colors.text,
            fontWeight: '600' as const,
            fontSize: 17,
          },
          headerShadowVisible: false,
        }}
      />

      {loadState === 'loading' && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Checking services...</Text>
        </View>
      )}

      {loadState === 'error' && (
        <View style={styles.centerState}>
          <View style={styles.errorIconWrap}>
            <XCircle size={40} color={Colors.danger} />
          </View>
          <Text style={styles.stateTitle}>Failed to load</Text>
          <Text style={styles.stateText}>Could not check service status. Please try again.</Text>
          <Pressable style={styles.retryBtn} onPress={handleRetry} testID="retry-button">
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {loadState === 'empty' && (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>No services found</Text>
          <Text style={styles.stateText}>Nothing to check right now.</Text>
        </View>
      )}

      {loadState === 'success' && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {lastChecked ? (
            <View style={styles.timestampRow}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.timestampText}>Last checked {lastChecked}</Text>
            </View>
          ) : null}

          <View
            style={[
              styles.summaryBanner,
              {
                backgroundColor: overall.isHealthy
                  ? 'rgba(52, 199, 89, 0.08)'
                  : 'rgba(255, 149, 0, 0.08)',
                borderColor: overall.isHealthy
                  ? 'rgba(52, 199, 89, 0.20)'
                  : 'rgba(255, 149, 0, 0.20)',
              },
            ]}
          >
            <View style={styles.summaryIconWrap}>
              {overall.isHealthy ? (
                <CheckCircle size={22} color="#34C759" />
              ) : (
                <AlertTriangle size={22} color="#FF9500" />
              )}
            </View>
            <View style={styles.summaryTextWrap}>
              <Text
                style={[
                  styles.summaryTitle,
                  { color: overall.isHealthy ? '#1B8A3D' : '#996300' },
                ]}
              >
                {overall.label}
              </Text>
              <Text style={styles.summarySub}>
                {operationalCount}/{services.length} services up
                {issueCount > 0 ? ` · ${issueCount} with issues` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.cardList}>
            {services.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() => openDetail(service)}
                index={index}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <ServiceDetailModal
        service={selectedService}
        visible={modalVisible}
        onClose={closeDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  stateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },

  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  timestampText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },

  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 14,
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextWrap: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  summarySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },

  cardList: {
    gap: 10,
  },
  card: {
    backgroundColor: Colors.glassCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    padding: 14,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any)
      : {}),
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ scale: 0.985 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  cardTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  metricDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.borderLight,
  },
  cardNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    flex: 1,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    marginBottom: 14,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },

  detailCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    width: '100%',
  },
  detailCard: {
    flex: 1,
    backgroundColor: Colors.glassCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  detailCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCardLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailCardValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },

  detailSection: {
    width: '100%',
    marginTop: 24,
    backgroundColor: Colors.glassCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    padding: 16,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailSectionBody: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailActionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
    flex: 1,
  },
});
