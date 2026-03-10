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

const ACTIVE = '#4F2A87';
const INACTIVE = 'rgba(18,18,18,0.68)';

const TAB_SIZE = 52;
const DOCK_RADIUS = 34;
const H_PADDING = 12;
const V_PADDING = 10;
const GAP = 8;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedView = Animated.View;

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;

  const dockWidth = useMemo(() => {
    return Math.min(
      SCREEN_WIDTH - 28,
      tabCount * TAB_SIZE + (tabCount - 1) * GAP + H_PADDING * 2
    );
  }, [tabCount]);

  const dockHeight = TAB_SIZE + V_PADDING * 2;

  const cellWidth = useMemo(() => {
    return (dockWidth - H_PADDING * 2) / tabCount;
  }, [dockWidth, tabCount]);

  const position = useRef(new Animated.Value(state.index)).current;
  const pillScale = useRef(new Animated.Value(1)).current;
  const pillGlow = useRef(new Animated.Value(0)).current;
  const sheenX = useRef(new Animated.Value(-20)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: state.index,
      tension: 120,
      friction: 16,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.sequence([
        Animated.spring(pillScale, {
          toValue: 1.035,
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
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pillGlow, {
          toValue: 0.55,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(sheenX, {
          toValue: 18,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheenX, {
          toValue: 8,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    state.routes.forEach((_, i) => {
      Animated.spring(iconScales[i], {
        toValue: i === state.index ? 1.07 : 1,
        tension: 210,
        friction: 18,
        useNativeDriver: true,
      }).start();
    });

    // reset sheen origin for next move
    sheenX.setValue(-20);
  }, [state.index, position, pillScale, pillGlow, sheenX, iconScales, state.routes]);

  const pillTranslateX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => H_PADDING + i * cellWidth + (cellWidth - TAB_SIZE) / 2
    ),
  });

  const glowOpacity = pillGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.28],
  });

  const glowScale = pillGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
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
        {/* soft static outer glow */}
        <View
          pointerEvents="none"
          style={[
            styles.outerAura,
            {
              width: dockWidth + 16,
              height: dockHeight + 16,
              borderRadius: DOCK_RADIUS + 12,
            },
          ]}
        />

        <BlurView intensity={100} tint="light" style={styles.dock}>
          {/* base body */}
          <View pointerEvents="none" style={styles.baseFill} />

          {/* top white glass sheen */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.92)',
              'rgba(255,255,255,0.40)',
              'rgba(255,255,255,0.10)',
              'rgba(255,255,255,0.00)',
            ]}
            locations={[0, 0.18, 0.46, 1]}
            style={styles.topSheen}
          />

          {/* lower density / lens weight */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.00)',
              'rgba(210,214,225,0.00)',
              'rgba(190,194,208,0.08)',
              'rgba(150,154,172,0.16)',
            ]}
            locations={[0, 0.48, 0.76, 1]}
            style={styles.bottomDensity}
          />

          {/* subtle violet rim energy */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(170,110,255,0.22)',
              'rgba(170,110,255,0.08)',
              'rgba(170,110,255,0.00)',
            ]}
            locations={[0, 0.28, 1]}
            style={styles.violetRim}
          />

          {/* border stack */}
          <View pointerEvents="none" style={styles.outerStroke} />
          <View pointerEvents="none" style={styles.innerStroke} />

          {/* lower inner shadow */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(0,0,0,0.00)',
              'rgba(0,0,0,0.00)',
              'rgba(0,0,0,0.02)',
              'rgba(0,0,0,0.05)',
            ]}
            locations={[0, 0.54, 0.82, 1]}
            style={styles.innerShadow}
          />

          {/* active capsule */}
          <AnimatedView
            pointerEvents="none"
            style={[
              styles.pillWrap,
              {
                width: TAB_SIZE,
                height: TAB_SIZE,
                transform: [{ translateX: pillTranslateX }, { scale: pillScale }],
              },
            ]}
          >
            <AnimatedView
              style={[
                styles.pillAura,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            />

            <BlurView intensity={100} tint="light" style={styles.pill}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.94)',
                  'rgba(255,255,255,0.70)',
                  'rgba(255,255,255,0.34)',
                ]}
                locations={[0, 0.44, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.pillTint} />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,1.00)',
                  'rgba(255,255,255,0.54)',
                  'rgba(255,255,255,0.08)',
                  'rgba(255,255,255,0.00)',
                ]}
                locations={[0, 0.22, 0.54, 1]}
                style={styles.pillTopLight}
              />

              <AnimatedView
                style={[
                  styles.pillSheen,
                  {
                    transform: [{ translateX: sheenX }, { rotate: '-14deg' }],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.00)',
                    'rgba(255,255,255,0.72)',
                    'rgba(255,255,255,0.00)',
                  ]}
                  locations={[0, 0.5, 1]}
                  style={styles.pillSheenGradient}
                />
              </AnimatedView>

              <View style={styles.pillEmboss} />

              <LinearGradient
                colors={[
                  'rgba(0,0,0,0.00)',
                  'rgba(0,0,0,0.00)',
                  'rgba(0,0,0,0.03)',
                  'rgba(0,0,0,0.07)',
                ]}
                locations={[0, 0.50, 0.78, 1]}
                style={styles.pillBottomShade}
              />

              <View style={styles.pillInnerStroke} />
              <View style={styles.pillOuterStroke} />
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
                >
                  <AnimatedView style={{ transform: [{ scale: iconScales[index] }] }}>
                    <Icon size={19} color={focused ? ACTIVE : INACTIVE} />
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

  outerAura: {
    position: 'absolute',
    backgroundColor: 'rgba(126,70,255,0.08)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 16,
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
    elevation: 20,
    overflow: 'hidden',
  },

  baseFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  topSheen: {
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
    height: '74%',
    borderBottomLeftRadius: DOCK_RADIUS,
    borderBottomRightRadius: DOCK_RADIUS,
  },

  violetRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    borderTopLeftRadius: DOCK_RADIUS,
    borderTopRightRadius: DOCK_RADIUS,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.56)',
  },

  innerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: DOCK_RADIUS - 1,
    borderWidth: 0.55,
    borderTopColor: 'rgba(255,255,255,0.30)',
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderRightColor: 'rgba(255,255,255,0.10)',
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },

  innerShadow: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 2,
    height: '48%',
    borderBottomLeftRadius: DOCK_RADIUS - 2,
    borderBottomRightRadius: DOCK_RADIUS - 2,
  },

  pillWrap: {
    position: 'absolute',
    top: V_PADDING,
    borderRadius: 20,
    overflow: 'visible',
  },

  pillAura: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    backgroundColor: 'rgba(126,70,255,0.26)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
  },

  pill: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  pillTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95,47,153,0.08)',
  },

  pillTopLight: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 1,
    height: '52%',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },

  pillSheen: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    width: 22,
    left: 8,
    opacity: 0.62,
  },

  pillSheenGradient: {
    flex: 1,
    borderRadius: 18,
  },

  pillEmboss: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 1,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderRadius: 2,
  },

  pillBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  pillInnerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: 19,
    borderWidth: 0.72,
    borderTopColor: 'rgba(255,255,255,0.58)',
    borderLeftColor: 'rgba(255,255,255,0.30)',
    borderRightColor: 'rgba(255,255,255,0.18)',
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },

  pillOuterStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
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
    borderRadius: 18,
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