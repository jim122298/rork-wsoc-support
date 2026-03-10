import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  Easing,
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

const ACTIVE = '#4B2A86';
const INACTIVE = 'rgba(24,24,28,0.62)';

const TAB_SIZE = 56;
const DOCK_RADIUS = 30;
const H_PADDING = 14;
const V_PADDING = 12;
const GAP = 6;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedView = Animated.View;

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;

  const dockWidth = useMemo(() => {
    return Math.min(
      SCREEN_WIDTH - 24,
      tabCount * TAB_SIZE + (tabCount - 1) * GAP + H_PADDING * 2
    );
  }, [tabCount]);

  const dockHeight = TAB_SIZE + V_PADDING * 2;

  const cellWidth = useMemo(() => {
    return (dockWidth - H_PADDING * 2) / tabCount;
  }, [dockWidth, tabCount]);

  const activeIndex = useRef(new Animated.Value(state.index)).current;
  const lensScale = useRef(new Animated.Value(1)).current;
  const lensGlow = useRef(new Animated.Value(0.75)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const iconY = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const sweep = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.spring(activeIndex, {
      toValue: state.index,
      tension: 110,
      friction: 15,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.sequence([
        Animated.spring(lensScale, {
          toValue: 1.08,
          tension: 240,
          friction: 16,
          useNativeDriver: true,
        }),
        Animated.spring(lensScale, {
          toValue: 1,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(lensGlow, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(lensGlow, {
          toValue: 0.8,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      sweep.setValue(-1);
    });

    state.routes.forEach((_, i) => {
      const focused = i === state.index;

      Animated.parallel([
        Animated.spring(iconScales[i], {
          toValue: focused ? 1.08 : 1,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.spring(iconY[i], {
          toValue: focused ? -1.5 : 0,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [state.index, activeIndex, lensScale, lensGlow, iconScales, iconY, sweep, state.routes]);

  const lensTranslateX = activeIndex.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => H_PADDING + i * cellWidth + (cellWidth - TAB_SIZE) / 2
    ),
  });

  const lensGlowOpacity = lensGlow.interpolate({
    inputRange: [0.75, 1],
    outputRange: [0.18, 0.32],
  });

  const sweepTranslateX = sweep.interpolate({
    inputRange: [-1, 1],
    outputRange: [-dockWidth * 0.8, dockWidth * 0.8],
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
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={[styles.wrap, { width: dockWidth, height: dockHeight }]}>
        {/* subtle floating aura */}
        <View
          pointerEvents="none"
          style={[
            styles.baseAura,
            {
              width: dockWidth + 18,
              height: dockHeight + 18,
              borderRadius: DOCK_RADIUS + 12,
            },
          ]}
        />

        <BlurView intensity={95} tint="light" style={styles.dock}>
          {/* material base */}
          <View pointerEvents="none" style={styles.baseFill} />

          {/* top crystal wash */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.90)',
              'rgba(255,255,255,0.34)',
              'rgba(255,255,255,0.08)',
              'rgba(255,255,255,0.00)',
            ]}
            locations={[0, 0.2, 0.48, 1]}
            style={styles.topWash}
          />

          {/* bottom density */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.00)',
              'rgba(220,224,236,0.00)',
              'rgba(180,186,205,0.08)',
              'rgba(145,150,170,0.14)',
            ]}
            locations={[0, 0.48, 0.78, 1]}
            style={styles.bottomDensity}
          />

          {/* moving reflective sweep */}
          <AnimatedView
            pointerEvents="none"
            style={[
              styles.sweepWrap,
              {
                transform: [{ translateX: sweepTranslateX }, { rotate: '-12deg' }],
              },
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0.26)',
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0)',
              ]}
              locations={[0, 0.22, 0.5, 0.78, 1]}
              style={styles.sweepGradient}
            />
          </AnimatedView>

          {/* glass border */}
          <View pointerEvents="none" style={styles.outerStroke} />
          <View pointerEvents="none" style={styles.innerStroke} />

          {/* segmented dividers */}
          <View pointerEvents="none" style={styles.dividerRow}>
            {state.routes.map((_, i) => {
              if (i === state.routes.length - 1) return null;
              return <View key={`divider-${i}`} style={styles.divider} />;
            })}
          </View>

          {/* active circular lens */}
          <AnimatedView
            pointerEvents="none"
            style={[
              styles.lensWrap,
              {
                width: TAB_SIZE,
                height: TAB_SIZE,
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

            <BlurView intensity={100} tint="light" style={styles.lens}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.92)',
                  'rgba(255,255,255,0.64)',
                  'rgba(255,255,255,0.22)',
                ]}
                locations={[0, 0.46, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.lensTint} />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,0.50)',
                  'rgba(255,255,255,0.00)',
                ]}
                locations={[0, 0.34, 1]}
                style={styles.lensHighlight}
              />

              <View style={styles.lensInnerStroke} />
              <View style={styles.lensOuterStroke} />
            </BlurView>
          </AnimatedView>

          {/* icon row */}
          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const Icon = ICON_MAP[route.name] || Ellipsis;

              return (
                <Pressable
                  key={route.key}
                  onPress={() => handleTabPress(route.key, route.name, focused)}
                  style={styles.button}
                  testID={`tab-${route.name}`}
                >
                  <AnimatedView
                    style={{
                      transform: [
                        { scale: iconScales[index] },
                        { translateY: iconY[index] },
                      ],
                    }}
                  >
                    <Icon size={20} color={focused ? ACTIVE : INACTIVE} />
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
    backgroundColor: 'rgba(110, 80, 255, 0.05)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },

  dock: {
    width: '100%',
    height: '100%',
    borderRadius: DOCK_RADIUS,
    paddingHorizontal: H_PADDING,
    paddingVertical: V_PADDING,
    backgroundColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 18,
    overflow: 'hidden',
  },

  baseFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },

  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '56%',
    borderTopLeftRadius: DOCK_RADIUS,
    borderTopRightRadius: DOCK_RADIUS,
  },

  bottomDensity: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
    borderBottomLeftRadius: DOCK_RADIUS,
    borderBottomRightRadius: DOCK_RADIUS,
  },

  sweepWrap: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 90,
    opacity: 0.9,
  },

  sweepGradient: {
    flex: 1,
    borderRadius: 40,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 0.85,
    borderColor: 'rgba(255,255,255,0.54)',
  },

  innerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: DOCK_RADIUS - 1,
    borderWidth: 0.55,
    borderTopColor: 'rgba(255,255,255,0.26)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.10)',
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },

  dividerRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: H_PADDING + TAB_SIZE / 2 - 1,
  },

  divider: {
    width: 1,
    height: 24,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 1,
  },

  lensWrap: {
    position: 'absolute',
    top: V_PADDING,
    borderRadius: TAB_SIZE / 2,
    overflow: 'visible',
  },

  lensGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_SIZE / 2 + 4,
    backgroundColor: 'rgba(126,70,255,0.24)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },

  lens: {
    flex: 1,
    borderRadius: TAB_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.26)',
  },

  lensTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95,47,153,0.07)',
  },

  lensHighlight: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 2,
    height: '45%',
    borderTopLeftRadius: TAB_SIZE / 2,
    borderTopRightRadius: TAB_SIZE / 2,
  },

  lensInnerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: TAB_SIZE / 2,
    borderWidth: 0.7,
    borderTopColor: 'rgba(255,255,255,0.52)',
    borderLeftColor: 'rgba(255,255,255,0.24)',
    borderRightColor: 'rgba(255,255,255,0.18)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  lensOuterStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_SIZE / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.44)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
        } as any)
      : {}),
  },
});