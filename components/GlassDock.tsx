import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Easing,
  Platform,
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

const DIAL_SIZE = Math.min(SCREEN_WIDTH * 0.88, 340);
const RING_RADIUS = DIAL_SIZE / 2 - 42;
const ITEM_SIZE = 54;
const CENTER_LENS = 84;
const GLASS_RADIUS = 36;
const SWEEP_ANGLE = 132; // visible half-dial spread
const STEP_DRAG = 52; // drag px per tab step

const ACTIVE = '#4D2A88';
const INACTIVE = 'rgba(24,24,28,0.62)';
const TEXT_ACTIVE = 'rgba(30,18,54,0.95)';
const TEXT_INACTIVE = 'rgba(50,50,58,0.55)';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CameraDialDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const count = routes.length;

  const angleStep = count > 1 ? SWEEP_ANGLE / (count - 1) : 0;
  const startAngle = -90 - SWEEP_ANGLE / 2;

  const currentIndexRef = useRef(state.index);
  const [snappedIndex, setSnappedIndex] = useState(state.index);

  const dialRotation = useRef(new Animated.Value(state.index)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;
  const centerScale = useRef(new Animated.Value(1)).current;
  const centerGlow = useRef(new Animated.Value(0.72)).current;
  const sheenSweep = useRef(new Animated.Value(-20)).current;

  const itemScales = useRef(routes.map(() => new Animated.Value(1))).current;
  const itemY = useRef(routes.map(() => new Animated.Value(0))).current;
  const itemOpacity = useRef(routes.map(() => new Animated.Value(0.72))).current;

  useEffect(() => {
    currentIndexRef.current = state.index;
    setSnappedIndex(state.index);

    Animated.parallel([
      Animated.spring(dialRotation, {
        toValue: state.index,
        tension: 120,
        friction: 16,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(centerScale, {
          toValue: 1.05,
          tension: 220,
          friction: 15,
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
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    sheenSweep.setValue(-20);
    Animated.sequence([
      Animated.timing(sheenSweep, {
        toValue: 16,
        duration: 320,
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
        Animated.spring(itemScales[i], {
          toValue: focused ? 1.1 : 1,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.spring(itemY[i], {
          toValue: focused ? -2 : 0,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.timing(itemOpacity[i], {
          toValue: focused ? 1 : 0.72,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [state.index]);

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
        onPanResponderGrant: () => {
          dragOffset.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          dragOffset.setValue(g.dx / STEP_DRAG);
        },
        onPanResponderRelease: (_, g) => {
          dragOffset.flattenOffset?.();

          const raw = currentIndexRef.current - g.dx / STEP_DRAG;
          const nextIndex = Math.max(0, Math.min(count - 1, Math.round(raw)));

          Animated.spring(dragOffset, {
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
          Animated.spring(dragOffset, {
            toValue: 0,
            tension: 120,
            friction: 16,
            useNativeDriver: true,
          }).start();
        },
      }),
    [count, navigation]
  );

  const combinedIndex = Animated.add(dialRotation, dragOffset);

  const glowOpacity = centerGlow.interpolate({
    inputRange: [0.72, 1],
    outputRange: [0.18, 0.32],
  });

  const label = routes[snappedIndex]?.name?.replace(/[()]/g, '').replace(/^\w/, (c) => c.toUpperCase()) ?? '';

  const focusedIcon = ICON_MAP[routes[snappedIndex]?.name] || Ellipsis;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* floating slab */}
        <View style={styles.shadowBase} />

        <BlurView intensity={100} tint="light" style={styles.glassSlab}>
          <View pointerEvents="none" style={styles.baseFill} />

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.96)',
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

          {/* top reflective slash */}
          <View pointerEvents="none" style={styles.reflectionWrap}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.10)',
                'rgba(255,255,255,0.28)',
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0)',
              ]}
              locations={[0, 0.18, 0.5, 0.78, 1]}
              style={styles.reflectionBand}
            />
          </View>

          {/* upper ring track */}
          <View pointerEvents="none" style={styles.trackOuter} />
          <View pointerEvents="none" style={styles.trackInner} />
          <View pointerEvents="none" style={styles.tickRow}>
            {routes.map((_, i) => {
              const theta = (startAngle + i * angleStep) * (Math.PI / 180);
              const x = DIAL_SIZE / 2 + Math.cos(theta) * (RING_RADIUS + 20);
              const y = DIAL_SIZE / 2 + Math.sin(theta) * (RING_RADIUS + 20);

              return (
                <View
                  key={`tick-${i}`}
                  style={[
                    styles.tick,
                    {
                      left: x - 1,
                      top: y - 6,
                      transform: [{ rotate: `${startAngle + i * angleStep + 90}deg` }],
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* ring items */}
          {routes.map((route, i) => {
            const Icon = ICON_MAP[route.name] || Ellipsis;

            const translateX = combinedIndex.interpolate({
              inputRange: [i - 2, i - 1, i, i + 1, i + 2],
              outputRange: [-999, -999, 0, 999, 999],
              extrapolate: 'clamp',
            });

            const itemAngle = Animated.multiply(
              Animated.add(Animated.multiply(combinedIndex, -angleStep), new Animated.Value(startAngle + i * angleStep)),
              Math.PI / 180
            ) as any;

            // RN Animated can't directly cos/sin. Precompute by focused states? Better use static positions relative to snapped state?
            // Use JS-calculated positions from snappedIndex for reliability.
            const rel = i - snappedIndex;
            const angleDeg = startAngle + (i * angleStep) - snappedIndex * angleStep;
            const angleRad = angleDeg * (Math.PI / 180);

            const x = DIAL_SIZE / 2 + Math.cos(angleRad) * RING_RADIUS - ITEM_SIZE / 2;
            const y = DIAL_SIZE / 2 + Math.sin(angleRad) * RING_RADIUS - ITEM_SIZE / 2;

            const focused = i === snappedIndex;

            return (
              <AnimatedPressable
                key={route.key}
                onPress={() => navigateToIndex(i)}
                style={[
                  styles.itemButton,
                  {
                    left: x,
                    top: y,
                    opacity: itemOpacity[i],
                    transform: [
                      { scale: itemScales[i] },
                      { translateY: itemY[i] },
                    ],
                  },
                ]}
              >
                {focused ? (
                  <>
                    <Icon size={20} color="rgba(255,255,255,0.86)" strokeWidth={2.2} />
                    <View style={styles.iconOverlay}>
                      <Icon size={20} color={ACTIVE} strokeWidth={2.2} />
                    </View>
                  </>
                ) : (
                  <Icon size={19} color={INACTIVE} strokeWidth={2.1} />
                )}
              </AnimatedPressable>
            );
          })}

          {/* center circular lens */}
          <AnimatedView
            pointerEvents="none"
            style={[
              styles.centerLensWrap,
              {
                transform: [{ scale: centerScale }],
              },
            ]}
          >
            <AnimatedView
              style={[
                styles.centerLensGlow,
                {
                  opacity: glowOpacity,
                },
              ]}
            />

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
                <focusedIcon size={26} color="rgba(255,255,255,0.88)" strokeWidth={2.25} />
                <View style={styles.iconOverlay}>
                  {React.createElement(focusedIcon, {
                    size: 26,
                    color: ACTIVE,
                    strokeWidth: 2.25,
                  })}
                </View>
              </View>
            </BlurView>
          </AnimatedView>

          {/* label */}
          <View pointerEvents="none" style={styles.labelWrap}>
            <Animated.Text style={styles.modeLabel}>{label}</Animated.Text>
            <Animated.Text style={styles.modeHint}>Swipe to change mode</Animated.Text>
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

  container: {
    width: DIAL_SIZE,
    height: 176,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },

  shadowBase: {
    position: 'absolute',
    width: DIAL_SIZE - 8,
    height: 134,
    bottom: 0,
    borderRadius: GLASS_RADIUS,
    backgroundColor: 'rgba(126,70,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 22,
  },

  glassSlab: {
    position: 'absolute',
    bottom: 0,
    width: DIAL_SIZE,
    height: 138,
    borderRadius: GLASS_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  baseFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: GLASS_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '56%',
    borderTopLeftRadius: GLASS_RADIUS,
    borderTopRightRadius: GLASS_RADIUS,
  },

  bottomDensity: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    borderBottomLeftRadius: GLASS_RADIUS,
    borderBottomRightRadius: GLASS_RADIUS,
  },

  reflectionWrap: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: '34%',
    width: 70,
    opacity: 0.9,
    transform: [{ rotate: '-15deg' }],
  },

  reflectionBand: {
    flex: 1,
    borderRadius: 40,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: GLASS_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
  },

  innerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: GLASS_RADIUS - 1,
    borderWidth: 0.6,
    borderTopColor: 'rgba(255,255,255,0.30)',
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderRightColor: 'rgba(255,255,255,0.11)',
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },

  trackOuter: {
    position: 'absolute',
    width: DIAL_SIZE - 74,
    height: DIAL_SIZE - 74,
    borderRadius: 999,
    top: -58,
    left: 37,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  trackInner: {
    position: 'absolute',
    width: DIAL_SIZE - 88,
    height: DIAL_SIZE - 88,
    borderRadius: 999,
    top: -51,
    left: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },

  tickRow: {
    position: 'absolute',
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    top: -76,
    left: 0,
  },

  tick: {
    position: 'absolute',
    width: 2,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  itemButton: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerLensWrap: {
    position: 'absolute',
    left: (DIAL_SIZE - CENTER_LENS) / 2,
    top: -18,
    width: CENTER_LENS,
    height: CENTER_LENS,
    borderRadius: CENTER_LENS / 2,
    overflow: 'visible',
  },

  centerLensGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CENTER_LENS / 2 + 4,
    backgroundColor: 'rgba(126,70,255,0.24)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
  },

  centerLens: {
    flex: 1,
    borderRadius: CENTER_LENS / 2,
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
    borderTopLeftRadius: CENTER_LENS / 2,
    borderTopRightRadius: CENTER_LENS / 2,
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
    borderRadius: CENTER_LENS / 2,
    borderWidth: 0.8,
    borderTopColor: 'rgba(255,255,255,0.58)',
    borderLeftColor: 'rgba(255,255,255,0.26)',
    borderRightColor: 'rgba(255,255,255,0.18)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  centerOuterStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CENTER_LENS / 2,
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
    bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_ACTIVE,
    letterSpacing: 0.2,
  },

  modeHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_INACTIVE,
  },

  webFallback: {
    position: 'absolute',
    bottom: 0,
    width: DIAL_SIZE,
    height: 138,
    borderRadius: GLASS_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.46)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
        } as any)
      : {}),
  },
});