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

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size: number; color: string; strokeWidth?: number }>
> = {
  '(home)': Headset,
  scanner: MessageCircle,
  categories: Grid3x3,
  bookmarks: Bookmark,
  settings: Ellipsis,
};

const ACTIVE = '#4F2B8A';
const INACTIVE = 'rgba(20,20,24,0.62)';

const TAB_SIZE = 50;
const LENS_SIZE = 44;
const DOCK_RADIUS = 24;
const H_PADDING = 12;
const V_PADDING = 8;
const GAP = 8;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedView = Animated.View;

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;

  const contentWidth = useMemo(
    () => tabCount * TAB_SIZE + (tabCount - 1) * GAP,
    [tabCount]
  );

  const dockWidth = useMemo(() => {
    return Math.min(SCREEN_WIDTH - 36, contentWidth + H_PADDING * 2);
  }, [contentWidth]);

  const dockHeight = TAB_SIZE + V_PADDING * 2;

  const leadingOffset = useMemo(() => {
    return (dockWidth - contentWidth) / 2;
  }, [dockWidth, contentWidth]);

  const activeIndex = useRef(new Animated.Value(state.index)).current;
  const lensScale = useRef(new Animated.Value(1)).current;
  const lensGlow = useRef(new Animated.Value(0.65)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const iconY = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const iconOpacity = useRef(state.routes.map(() => new Animated.Value(0.8))).current;
  const sheenSweep = useRef(new Animated.Value(-18)).current;

  useEffect(() => {
    Animated.spring(activeIndex, {
      toValue: state.index,
      tension: 120,
      friction: 16,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.sequence([
        Animated.spring(lensScale, {
          toValue: 1.06,
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
          toValue: 0.72,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(sheenSweep, {
          toValue: 12,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheenSweep, {
          toValue: 6,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      sheenSweep.setValue(-18);
    });

    state.routes.forEach((_, i) => {
      const focused = i === state.index;

      Animated.parallel([
        Animated.spring(iconScales[i], {
          toValue: focused ? 1.06 : 1,
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
    outputRange: state.routes.map((_, i) => {
      const itemX = leadingOffset + i * (TAB_SIZE + GAP);
      return itemX + (TAB_SIZE - LENS_SIZE) / 2;
    }),
  });

  const lensGlowOpacity = lensGlow.interpolate({
    inputRange: [0.65, 1],
    outputRange: [0.14, 0.28],
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
        <View
          pointerEvents="none"
          style={[
            styles.baseAura,
            {
              width: dockWidth + 14,
              height: dockHeight + 14,
              borderRadius: DOCK_RADIUS + 10,
            },
          ]}
        />

        <BlurView intensity={100} tint="light" style={styles.dock}>
          <View pointerEvents="none" style={styles.baseFill} />

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.95)',
              'rgba(255,255,255,0.52)',
              'rgba(255,255,255,0.12)',
              'rgba(255,255,255,0.00)',
            ]}
            locations={[0, 0.16, 0.42, 1]}
            style={styles.topWash}
          />

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.00)',
              'rgba(222,226,236,0.00)',
              'rgba(188,194,208,0.09)',
              'rgba(145,150,168,0.16)',
            ]}
            locations={[0, 0.5, 0.78, 1]}
            style={styles.bottomDensity}
          />

          {/* older Mac dock-ish reflective stripe */}
          <View pointerEvents="none" style={styles.reflectionBandWrap}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.10)',
                'rgba(255,255,255,0.30)',
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0)',
              ]}
              locations={[0, 0.18, 0.5, 0.78, 1]}
              style={styles.reflectionBand}
            />
          </View>

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(176,125,255,0.16)',
              'rgba(176,125,255,0.05)',
              'rgba(176,125,255,0.00)',
            ]}
            locations={[0, 0.35, 1]}
            style={styles.topRim}
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

            <BlurView intensity={100} tint="light" style={styles.lens}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.95)',
                  'rgba(255,255,255,0.74)',
                  'rgba(255,255,255,0.28)',
                ]}
                locations={[0, 0.42, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.lensTint} />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,0.58)',
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
                        <Icon size={19} color="rgba(255,255,255,0.86)" strokeWidth={2.2} />
                        <View style={styles.iconOverlay}>
                          <Icon size={19} color={ACTIVE} strokeWidth={2.2} />
                        </View>
                      </>
                    ) : (
                      <Icon size={19} color={INACTIVE} strokeWidth={2.1} />
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
    shadowRadius: 16,
    elevation: 12,
  },

  dock: {
    width: '100%',
    height: '100%',
    borderRadius: DOCK_RADIUS,
    paddingHorizontal: H_PADDING,
    paddingVertical: V_PADDING,
    backgroundColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
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
    height: 14,
    borderTopLeftRadius: DOCK_RADIUS,
    borderTopRightRadius: DOCK_RADIUS,
  },

  reflectionBandWrap: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    left: '32%',
    width: 64,
    opacity: 0.9,
    transform: [{ rotate: '-15deg' }],
  },

  reflectionBand: {
    flex: 1,
    borderRadius: 40,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
  },

  innerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: DOCK_RADIUS - 1,
    borderWidth: 0.6,
    borderTopColor: 'rgba(255,255,255,0.30)',
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderRightColor: 'rgba(255,255,255,0.11)',
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(126,70,255,0.24)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
  },

  lens: {
    flex: 1,
    borderRadius: LENS_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.30)',
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
    borderTopLeftRadius: LENS_SIZE / 2,
    borderTopRightRadius: LENS_SIZE / 2,
  },

  lensSheen: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 7,
    width: 18,
    opacity: 0.6,
  },

  lensSheenGradient: {
    flex: 1,
    borderRadius: 14,
  },

  lensInnerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: LENS_SIZE / 2,
    borderWidth: 0.8,
    borderTopColor: 'rgba(255,255,255,0.58)',
    borderLeftColor: 'rgba(255,255,255,0.26)',
    borderRightColor: 'rgba(255,255,255,0.18)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  lensOuterStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LENS_SIZE / 2,
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