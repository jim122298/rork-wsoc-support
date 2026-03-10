import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Headset,
  MessageCircle,
  Grid3x3,
  Bookmark,
  Ellipsis,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  '(home)': Headset,
  scanner: MessageCircle,
  categories: Grid3x3,
  bookmarks: Bookmark,
  settings: Ellipsis,
};

const ACCENT = '#5F2F99';
const ACTIVE_ICON = '#4C2481';
const INACTIVE = 'rgba(25,25,25,0.72)';

const TAB_SIZE = 50;
const DOCK_RADIUS = 30;
const DOCK_HORIZONTAL_PADDING = 12;
const DOCK_VERTICAL_PADDING = 10;
const GAP = 8;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;

  const dockWidth = useMemo(() => {
    return Math.min(
      SCREEN_WIDTH - 28,
      tabCount * TAB_SIZE + (tabCount - 1) * GAP + DOCK_HORIZONTAL_PADDING * 2
    );
  }, [tabCount]);

  const cellWidth = useMemo(() => {
    return (dockWidth - DOCK_HORIZONTAL_PADDING * 2) / tabCount;
  }, [dockWidth, tabCount]);

  const pillAnim = useRef(new Animated.Value(state.index)).current;
  const pillScale = useRef(new Animated.Value(1)).current;
  const pillGlow = useRef(new Animated.Value(0.92)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: state.index,
      tension: 110,
      friction: 16,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.sequence([
        Animated.spring(pillScale, {
          toValue: 1.04,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.spring(pillScale, {
          toValue: 1,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(pillGlow, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(pillGlow, {
          toValue: 0.96,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    state.routes.forEach((_, i) => {
      const focused = i === state.index;
      Animated.spring(iconScales[i], {
        toValue: focused ? 1.08 : 1,
        tension: 220,
        friction: 18,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index, iconScales, pillAnim, pillGlow, pillScale, state.routes]);

  const pillTranslateX = pillAnim.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => DOCK_HORIZONTAL_PADDING + i * cellWidth + (cellWidth - TAB_SIZE) / 2
    ),
  });

  const handleTabPress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate(routeName as never);
      }
    },
    [navigation]
  );

  return (
    <View
      style={[styles.dockOuter, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      <View style={[styles.dockWrap, { width: dockWidth }]}>
        <BlurView intensity={85} tint="light" style={styles.dockGlass}>
          {/* Base bright material */}
          <View pointerEvents="none" style={styles.baseTint} />

          {/* Apple-style top sheen */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.65)',
              'rgba(255,255,255,0.20)',
              'rgba(255,255,255,0.04)',
              'rgba(255,255,255,0.00)',
            ]}
            locations={[0, 0.22, 0.5, 1]}
            style={styles.topSheen}
          />

          {/* Bottom depth */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.00)',
              'rgba(255,255,255,0.00)',
              'rgba(210,210,220,0.10)',
              'rgba(180,180,195,0.16)',
            ]}
            locations={[0, 0.45, 0.78, 1]}
            style={styles.bottomDepth}
          />

          {/* Outer hairline */}
          <View pointerEvents="none" style={styles.hairline} />

          {/* Inner soft border */}
          <View pointerEvents="none" style={styles.innerStroke} />

          {/* Active liquid capsule */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectionBlob,
              {
                width: TAB_SIZE,
                height: TAB_SIZE,
                transform: [
                  { translateX: pillTranslateX },
                  { scale: pillScale },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.selectionShadowWrap,
                {
                  transform: [{ scale: pillGlow }],
                },
              ]}
            >
              <BlurView intensity={100} tint="light" style={styles.selectionBlur}>
                {/* brighter Apple-esque glass body */}
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.74)',
                    'rgba(255,255,255,0.50)',
                    'rgba(255,255,255,0.26)',
                  ]}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFillObject}
                />

                {/* soft violet material tint */}
                <View style={styles.selectionTint} />

                {/* top gleam */}
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.82)',
                    'rgba(255,255,255,0.28)',
                    'rgba(255,255,255,0.00)',
                  ]}
                  locations={[0, 0.36, 1]}
                  style={styles.selectionSheen}
                />

                {/* subtle inner edge */}
                <View style={styles.selectionInnerStroke} />

                {/* subtle outer edge */}
                <View style={styles.selectionOuterStroke} />
              </BlurView>
            </Animated.View>
          </Animated.View>

          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const IconComp = ICON_MAP[route.name] || Ellipsis;
              const color = isFocused ? ACTIVE_ICON : INACTIVE;

              return (
                <Pressable
                  key={route.key}
                  onPress={() => handleTabPress(route.key, route.name, isFocused)}
                  style={styles.tabButton}
                  testID={`tab-${route.name}`}
                >
                  <Animated.View style={{ transform: [{ scale: iconScales[index] }] }}>
                    <IconComp size={19} color={color} />
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        </BlurView>

        {Platform.OS === 'web' ? <View pointerEvents="none" style={styles.webFallback} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 100,
  },

  dockWrap: {
    borderRadius: DOCK_RADIUS,
    overflow: 'hidden',
  },

  dockGlass: {
    borderRadius: DOCK_RADIUS,
    paddingVertical: DOCK_VERTICAL_PADDING,
    paddingHorizontal: DOCK_HORIZONTAL_PADDING,
    backgroundColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 20,
  },

  baseTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  topSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '62%',
    borderTopLeftRadius: DOCK_RADIUS,
    borderTopRightRadius: DOCK_RADIUS,
  },

  bottomDepth: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    borderBottomLeftRadius: DOCK_RADIUS,
    borderBottomRightRadius: DOCK_RADIUS,
  },

  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 0.7,
    borderColor: 'rgba(255,255,255,0.52)',
  },

  innerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: DOCK_RADIUS - 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  selectionBlob: {
    position: 'absolute',
    top: DOCK_VERTICAL_PADDING,
    borderRadius: 19,
    overflow: 'visible',
  },

  selectionShadowWrap: {
    flex: 1,
    borderRadius: 19,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },

  selectionBlur: {
    flex: 1,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  selectionTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95,47,153,0.08)',
  },

  selectionSheen: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 1,
    height: '52%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  selectionInnerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: 18,
    borderWidth: 0.6,
    borderColor: 'rgba(255,255,255,0.42)',
  },

  selectionOuterStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 19,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GAP,
  },

  tabButton: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: DOCK_RADIUS,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        } as any)
      : {}),
  },
});
