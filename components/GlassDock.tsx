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

const ACTIVE = '#FFFFFF';
const INACTIVE = 'rgba(255,255,255,0.78)';
const ACTIVE_RING = '#7C5CFF';
const ACTIVE_RING_GLOW = 'rgba(124,92,255,0.34)';

const TAB_SIZE = 48;
const LENS_SIZE = 40;
const DOCK_RADIUS = 24;
const H_PADDING = 10;
const V_PADDING = 8;
const GAP = 4;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedView = Animated.View;

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;

  const dockWidth = useMemo(() => {
    return Math.min(
      SCREEN_WIDTH - 20,
      tabCount * TAB_SIZE + (tabCount - 1) * GAP + H_PADDING * 2
    );
  }, [tabCount]);

  const dockHeight = TAB_SIZE + V_PADDING * 2;

  const cellWidth = useMemo(() => {
    return (dockWidth - H_PADDING * 2) / tabCount;
  }, [dockWidth, tabCount]);

  const activeIndex = useRef(new Animated.Value(state.index)).current;
  const lensScale = useRef(new Animated.Value(1)).current;
  const lensGlow = useRef(new Animated.Value(0.78)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const iconY = useRef(state.routes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.spring(activeIndex, {
      toValue: state.index,
      tension: 115,
      friction: 15,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.sequence([
        Animated.spring(lensScale, {
          toValue: 1.04,
          tension: 210,
          friction: 16,
          useNativeDriver: true,
        }),
        Animated.spring(lensScale, {
          toValue: 1,
          tension: 210,
          friction: 18,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(lensGlow, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(lensGlow, {
          toValue: 0.84,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    state.routes.forEach((_, i) => {
      const focused = i === state.index;

      Animated.parallel([
        Animated.spring(iconScales[i], {
          toValue: focused ? 1.04 : 1,
          tension: 200,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.spring(iconY[i], {
          toValue: 0,
          tension: 200,
          friction: 18,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [state.index, activeIndex, lensScale, lensGlow, iconScales, iconY, state.routes]);

  const lensTranslateX = activeIndex.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => H_PADDING + i * cellWidth + (cellWidth - LENS_SIZE) / 2
    ),
  });

  const lensGlowOpacity = lensGlow.interpolate({
    inputRange: [0.78, 1],
    outputRange: [0.18, 0.28],
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
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View style={[styles.wrap, { width: dockWidth, height: dockHeight }]}>
        <View
          pointerEvents="none"
          style={[
            styles.baseAura,
            {
              width: dockWidth + 10,
              height: dockHeight + 10,
              borderRadius: DOCK_RADIUS + 8,
            },
          ]}
        />

        <BlurView intensity={75} tint="dark" style={styles.dock}>
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(50,54,64,0.94)',
              'rgba(35,39,48,0.96)',
              'rgba(22,25,32,0.98)',
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.18)',
              'rgba(255,255,255,0.06)',
              'rgba(255,255,255,0.00)',
            ]}
            locations={[0, 0.28, 1]}
            style={styles.topWash}
          />

          <View pointerEvents="none" style={styles.outerStroke} />
          <View pointerEvents="none" style={styles.innerStroke} />

          <AnimatedView
            pointerEvents="none"
            style={[
              styles.lensWrap,
              {
                width: LENS_SIZE,
                height: LENS_SIZE,
                transform: [{ translateX: lensTranslateX }, { scale: lensScale }],
              },
            ]}
          >
            <AnimatedView
              style={[
                styles.lensGlow,
                {
                  opacity: lensGlowOpacity,
                },
              ]}
            />

            <BlurView intensity={65} tint="dark" style={styles.lens}>
              <LinearGradient
                colors={[
                  'rgba(124,92,255,0.92)',
                  'rgba(106,78,238,0.96)',
                  'rgba(84,60,190,0.98)',
                ]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.22)',
                  'rgba(255,255,255,0.06)',
                  'rgba(255,255,255,0.00)',
                ]}
                locations={[0, 0.28, 1]}
                style={styles.lensHighlight}
              />

              <View style={styles.lensInnerStroke} />
              <View style={styles.lensOuterStroke} />
            </BlurView>
          </AnimatedView>

          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const Icon = ICON_MAP[route.name] || Ellipsis;

              return (
                <Pressable
                  key={route.key}
                  onPress={() => handleTabPress(route.key, route.name, focused)}
                  style={styles.button}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                  testID={`tab-${route.name}`}
                >
                  <AnimatedView
                    style={{
                      width: TAB_SIZE,
                      height: TAB_SIZE,
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: [
                        { scale: iconScales[index] },
                        { translateY: iconY[index] },
                      ],
                    }}
                  >
                    <Icon
                      size={18}
                      color={focused ? ACTIVE : INACTIVE}
                    />
                  </AnimatedView>
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
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 100,
  },

  wrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },

  baseAura: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 18,
  },

  dock: {
    width: '100%',
    height: '100%',
    borderRadius: DOCK_RADIUS,
    paddingHorizontal: H_PADDING,
    paddingVertical: V_PADDING,
    backgroundColor: 'rgba(28,30,36,0.94)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 18,
    overflow: 'hidden',
  },

  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    borderTopLeftRadius: DOCK_RADIUS,
    borderTopRightRadius: DOCK_RADIUS,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  innerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: DOCK_RADIUS - 1,
    borderWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderLeftColor: 'rgba(255,255,255,0.05)',
    borderRightColor: 'rgba(255,255,255,0.04)',
    borderBottomColor: 'rgba(0,0,0,0.18)',
  },

  lensWrap: {
    position: 'absolute',
    top: V_PADDING + (TAB_SIZE - LENS_SIZE) / 2,
    borderRadius: LENS_SIZE / 2,
    overflow: 'visible',
  },

  lensGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LENS_SIZE / 2 + 4,
    backgroundColor: ACTIVE_RING_GLOW,
    shadowColor: ACTIVE_RING,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },

  lens: {
    flex: 1,
    borderRadius: LENS_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: ACTIVE_RING,
  },

  lensHighlight: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 2,
    height: '42%',
    borderTopLeftRadius: LENS_SIZE / 2,
    borderTopRightRadius: LENS_SIZE / 2,
  },

  lensInnerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: LENS_SIZE / 2,
    borderWidth: 0.7,
    borderTopColor: 'rgba(255,255,255,0.24)',
    borderLeftColor: 'rgba(255,255,255,0.12)',
    borderRightColor: 'rgba(255,255,255,0.10)',
    borderBottomColor: 'rgba(0,0,0,0.14)',
  },

  lensOuterStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LENS_SIZE / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GAP,
  },

  button: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: TAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  webFallback: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    backgroundColor: 'rgba(28,30,36,0.94)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        } as any)
      : {}),
  },
});