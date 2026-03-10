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

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
  '(home)': Headset,
  scanner: MessageCircle,
  categories: Grid3x3,
  bookmarks: Bookmark,
  settings: Ellipsis,
};

const ACTIVE = '#4E2B87';
const INACTIVE = 'rgba(18,18,24,0.62)';

const TAB_SIZE = 56;
const DOCK_RADIUS = 32;
const H_PADDING = 14;
const V_PADDING = 12;
const GAP = 10;

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
    return TAB_SIZE + GAP;
  }, []);

  const leadingOffset = useMemo(() => {
    const usedWidth = tabCount * TAB_SIZE + (tabCount - 1) * GAP;
    return (dockWidth - usedWidth) / 2;
  }, [dockWidth, tabCount]);

  const activeIndex = useRef(new Animated.Value(state.index)).current;
  const lensScale = useRef(new Animated.Value(1)).current;
  const lensGlow = useRef(new Animated.Value(0.6)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const iconY = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const iconOpacity = useRef(state.routes.map(() => new Animated.Value(0.82))).current;
  const sheenSweep = useRef(new Animated.Value(-26)).current;

  useEffect(() => {
    Animated.spring(activeIndex, {
      toValue: state.index,
      tension: 115,
      friction: 16,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.sequence([
        Animated.spring(lensScale, {
          toValue: 1.07,
          tension: 220,
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
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(lensGlow, {
          toValue: 0.7,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(sheenSweep, {
          toValue: 16,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheenSweep, {
          toValue: 8,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      sheenSweep.setValue(-26);
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
          toValue: focused ? -1 : 0,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity[i], {
          toValue: focused ? 1 : 0.76,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [state.index, activeIndex, lensScale, lensGlow, iconScales, iconY, iconOpacity, sheenSweep, state.routes]);

  const lensTranslateX = activeIndex.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => leadingOffset + i * cellWidth
    ),
  });

  const lensGlowOpacity = lensGlow.interpolate({
    inputRange: [0.6, 1],
    outputRange: [0.16, 0.30],
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
        {/* outer aura */}
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

        <BlurView intensity={100} tint="light" style={styles.dock}>
          {/* base glass */}
          <View pointerEvents="none" style={styles.baseFill} />

          {/* upper bright refraction */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.96)',
              'rgba(255,255,255,0.50)',
              'rgba(255,255,255,0.12)',
              'rgba(255,255,255,0.00)',
            ]}
            locations={[0, 0.18, 0.46, 1]}
            style={styles.topWash}
          />

          {/* lower density */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.00)',
              'rgba(222,226,236,0.00)',
              'rgba(188,194,208,0.08)',
              'rgba(148,152,168,0.15)',
            ]}
            locations={[0, 0.5, 0.78, 1]}
            style={styles.bottomDensity}
          />

          {/* top rim glow */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(176,125,255,0.18)',
              'rgba(176,125,255,0.06)',
              'rgba(176,125,255,0.00)',
            ]}
            locations={[0, 0.35, 1]}
            style={styles.topRim}
          />

          {/* stationary light streak */}
          <View pointerEvents="none" style={styles.streakWrap}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.12)',
                'rgba(255,255,255,0.28)',
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0)',
              ]}
              locations={[0, 0.2, 0.5, 0.78, 1]}
              style={styles.streak}
            />
          </View>

          <View pointerEvents="none" style={styles.outerStroke} />
          <View pointerEvents="none" style={styles.innerStroke} />

          {/* clean lens */}
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
                  'rgba(255,255,255,0.94)',
                  'rgba(255,255,255,0.72)',
                  'rgba(255,255,255,0.28)',
                ]}
                locations={[0, 0.42, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.lensTint} />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,0.56)',
                  'rgba(255,255,255,0.00)',
                ]}
                locations={[0, 0.34, 1]}
                style={styles.lensHighlight}
              />

              <AnimatedView
                style={[
                  styles.lensSheen,
                  { transform: [{ translateX: sheenSweep }, { rotate: '-16deg' }] },
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0)',
                    'rgba(255,255,255,0.78)',
                    'rgba(255,255,255,0)',
                  ]}
                  locations={[0, 0.5, 1]}
                  style={styles.lensSheenGradient}
                />
              </AnimatedView>

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
                  android_ripple={null as any}
                  testID={`tab-${route.name}`}
                >
                  <AnimatedView
                    style={{
                      width: TAB_SIZE,
                      height: TAB_SIZE,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: iconOpacity[index],
                      transform: [
                        { scale: iconScales[index] },
                        { translateY: iconY[index] },
                      ],
                    }}
                  >
                    {focused ? (
                      <>
                        <Icon size={20} color="rgba(255,255,255,0.86)" strokeWidth={2.2} />
                        <View style={styles.iconOverlay}>
                          <Icon size={20} color={ACTIVE} strokeWidth={2.2} />
                        </View>
                      </>
                    ) : (
                      <Icon size={20} color={INACTIVE} strokeWidth={2.1} />
                    )}
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
    backgroundColor: 'rgba(118,86,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 18,
    overflow: 'hidden',
  },

  baseFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
    borderTopLeftRadius: DOCK_RADIUS,
    borderTopRightRadius: DOCK_RADIUS,
  },

  bottomDensity: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    borderBottomLeftRadius: DOCK_RADIUS,
    borderBottomRightRadius: DOCK_RADIUS,
  },

  topRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    borderTopLeftRadius: DOCK_RADIUS,
    borderTopRightRadius: DOCK_RADIUS,
  },

  streakWrap: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    left: '28%',
    width: 78,
    opacity: 0.85,
    transform: [{ rotate: '-15deg' }],
  },

  streak: {
    flex: 1,
    borderRadius: 40,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 0.85,
    borderColor: 'rgba(255,255,255,0.56)',
  },

  innerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: DOCK_RADIUS - 1,
    borderWidth: 0.6,
    borderTopColor: 'rgba(255,255,255,0.28)',
    borderLeftColor: 'rgba(255,255,255,0.16)',
    borderRightColor: 'rgba(255,255,255,0.10)',
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    shadowOpacity: 0.38,
    shadowRadius: 16,
  },

  lens: {
    flex: 1,
    borderRadius: TAB_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.28)',
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
    height: '46%',
    borderTopLeftRadius: TAB_SIZE / 2,
    borderTopRightRadius: TAB_SIZE / 2,
  },

  lensSheen: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 8,
    width: 20,
    opacity: 0.6,
  },

  lensSheenGradient: {
    flex: 1,
    borderRadius: 16,
  },

  lensInnerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: TAB_SIZE / 2,
    borderWidth: 0.75,
    borderTopColor: 'rgba(255,255,255,0.56)',
    borderLeftColor: 'rgba(255,255,255,0.26)',
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
    justifyContent: 'center',
    gap: GAP,
  },

  button: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TAB_SIZE / 2,
  },

  iconOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  webFallback: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.46)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
        } as any)
      : {}),
  },
});