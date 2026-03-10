import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Easing,
  Platform,
  Text,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DIAL_WIDTH = Math.min(SCREEN_WIDTH - 28, 340);
const DIAL_HEIGHT = 132;
const CENTER_SIZE = 78;
const ITEM_SIZE = 52;
const STEP_DRAG = 48;

const ACTIVE = '#4E2B87';
const INACTIVE = 'rgba(24,24,28,0.62)';

const AnimatedView = Animated.View;

export default function CameraDialDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const count = routes.length;

  const currentIndexRef = useRef(state.index);

  const dialShift = useRef(new Animated.Value(state.index)).current;
  const centerScale = useRef(new Animated.Value(1)).current;
  const centerGlow = useRef(new Animated.Value(0.72)).current;
  const sheenSweep = useRef(new Animated.Value(-18)).current;
  const dragX = useRef(new Animated.Value(0)).current;

  const iconScales = useRef(routes.map(() => new Animated.Value(1))).current;
  const iconOpacity = useRef(routes.map(() => new Animated.Value(0.72))).current;

  useEffect(() => {
    currentIndexRef.current = state.index;

    Animated.parallel([
      Animated.spring(dialShift, {
        toValue: state.index,
        tension: 120,
        friction: 16,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(centerScale, {
          toValue: 1.05,
          tension: 220,
          friction: 16,
          useNativeDriver: true,
        }),
        Animated.spring(centerScale, {
          toValue: 1,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(centerGlow, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(centerGlow, {
          toValue: 0.78,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    sheenSweep.setValue(-18);
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
    ]).start();

    routes.forEach((_, i) => {
      const focused = i === state.index;
      Animated.parallel([
        Animated.spring(iconScales[i], {
          toValue: focused ? 1.08 : 1,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity[i], {
          toValue: focused ? 1 : 0.72,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [state.index, routes, dialShift, centerScale, centerGlow, sheenSweep, iconScales, iconOpacity]);

  const glowOpacity = centerGlow.interpolate({
    inputRange: [0.72, 1],
    outputRange: [0.16, 0.30],
  });

  const navigateToIndex = (nextIndex: number) => {
    const route = routes[nextIndex];
    if (!route || nextIndex === currentIndexRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(route.name as never);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
        onPanResponderMove: (_, g) => {
          dragX.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const raw = currentIndexRef.current - g.dx / STEP_DRAG;
          const nextIndex = Math.max(0, Math.min(count - 1, Math.round(raw)));

          Animated.spring(dragX, {
            toValue: 0,
            tension: 120,
            friction: 16,
            useNativeDriver: true,
          }).start();

          if (nextIndex !== currentIndexRef.current) {
            Haptics.selectionAsync();
            navigateToIndex(nextIndex);
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragX, {
            toValue: 0,
            tension: 120,
            friction: 16,
            useNativeDriver: true,
          }).start();
        },
      }),
    [count, navigation, dragX]
  );

  const FocusedIcon = ICON_MAP[routes[state.index]?.name] || Ellipsis;
  const activeLabel =
    routes[state.index]?.name?.replace(/[()]/g, '').replace(/^\w/, (c) => c.toUpperCase()) || '';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={styles.wrap} {...panResponder.panHandlers}>
        <View style={styles.shadowBase} />

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
            locations={[0, 0.18, 0.44, 1]}
            style={styles.topWash}
          />

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0)',
              'rgba(200,204,220,0)',
              'rgba(165,170,190,0.08)',
              'rgba(128,132,150,0.14)',
            ]}
            locations={[0, 0.48, 0.78, 1]}
            style={styles.bottomDensity}
          />

          <View pointerEvents="none" style={styles.outerStroke} />
          <View pointerEvents="none" style={styles.innerStroke} />

          <View style={styles.row}>
            {routes.map((route, i) => {
              const Icon = ICON_MAP[route.name] || Ellipsis;
              const focused = i === state.index;

              return (
                <Pressable
                  key={route.key}
                  onPress={() => navigateToIndex(i)}
                  style={styles.itemButton}
                >
                  <AnimatedView
                    style={{
                      opacity: iconOpacity[i],
                      transform: [{ scale: iconScales[i] }],
                    }}
                  >
                    {focused ? (
                      <>
                        <Icon size={20} color="rgba(255,255,255,0.88)" strokeWidth={2.2} />
                        <View style={styles.iconOverlay}>
                          <Icon size={20} color={ACTIVE} strokeWidth={2.2} />
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

          <AnimatedView
            pointerEvents="none"
            style={[
              styles.centerLensWrap,
              {
                transform: [{ scale: centerScale }],
              },
            ]}
          >
            <AnimatedView style={[styles.centerLensGlow, { opacity: glowOpacity }]} />

            <BlurView intensity={100} tint="light" style={styles.centerLens}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.95)',
                  'rgba(255,255,255,0.74)',
                  'rgba(255,255,255,0.28)',
                ]}
                locations={[0, 0.42, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.centerLensTint} />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,0.58)',
                  'rgba(255,255,255,0)',
                ]}
                locations={[0, 0.34, 1]}
                style={styles.centerLensHighlight}
              />

              <AnimatedView
                style={[
                  styles.centerSheen,
                  {
                    transform: [{ translateX: sheenSweep }, { rotate: '-16deg' }],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0)',
                    'rgba(255,255,255,0.78)',
                    'rgba(255,255,255,0)',
                  ]}
                  locations={[0, 0.5, 1]}
                  style={styles.centerSheenGradient}
                />
              </AnimatedView>

              <View style={styles.centerInnerStroke} />
              <View style={styles.centerOuterStroke} />

              <View style={styles.centerIconWrap}>
                <FocusedIcon size={26} color="rgba(255,255,255,0.88)" strokeWidth={2.25} />
                <View style={styles.iconOverlay}>
                  <FocusedIcon size={26} color={ACTIVE} strokeWidth={2.25} />
                </View>
              </View>
            </BlurView>
          </AnimatedView>

          <View pointerEvents="none" style={styles.labelWrap}>
            <Text style={styles.modeLabel}>{activeLabel}</Text>
            <Text style={styles.modeHint}>Swipe to change mode</Text>
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
    width: DIAL_WIDTH,
    height: DIAL_HEIGHT + 26,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },

  shadowBase: {
    position: 'absolute',
    width: DIAL_WIDTH - 8,
    height: DIAL_HEIGHT,
    bottom: 0,
    borderRadius: 34,
    backgroundColor: 'rgba(126,70,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 22,
  },

  dock: {
    width: DIAL_WIDTH,
    height: DIAL_HEIGHT,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  baseFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '56%',
  },

  bottomDensity: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
  },

  innerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: 33,
    borderWidth: 0.6,
    borderTopColor: 'rgba(255,255,255,0.30)',
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderRightColor: 'rgba(255,255,255,0.11)',
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },

  row: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  itemButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerLensWrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: -18,
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    overflow: 'visible',
  },

  centerLensGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CENTER_SIZE / 2 + 4,
    backgroundColor: 'rgba(126,70,255,0.24)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
  },

  centerLens: {
    flex: 1,
    borderRadius: CENTER_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.30)',
  },

  centerLensTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95,47,153,0.08)',
  },

  centerLensHighlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 3,
    height: '45%',
    borderTopLeftRadius: CENTER_SIZE / 2,
    borderTopRightRadius: CENTER_SIZE / 2,
  },

  centerSheen: {
    position: 'absolute',
    top: 7,
    bottom: 7,
    left: 10,
    width: 20,
    opacity: 0.62,
  },

  centerSheenGradient: {
    flex: 1,
    borderRadius: 18,
  },

  centerInnerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: CENTER_SIZE / 2,
    borderWidth: 0.8,
    borderTopColor: 'rgba(255,255,255,0.58)',
    borderLeftColor: 'rgba(255,255,255,0.26)',
    borderRightColor: 'rgba(255,255,255,0.18)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  centerOuterStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CENTER_SIZE / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  centerIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    alignItems: 'center',
  },

  modeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(30,18,54,0.95)',
    letterSpacing: 0.2,
  },

  modeHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(50,50,58,0.55)',
  },

  webFallback: {
    position: 'absolute',
    bottom: 0,
    width: DIAL_WIDTH,
    height: DIAL_HEIGHT,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.46)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
        } as any)
      : {}),
  },
});