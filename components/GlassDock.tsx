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

const ACTIVE = '#4C2787';
const INACTIVE = 'rgba(10,10,10,0.65)';

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

  const dockHeight = useMemo(() => TAB_SIZE + V_PADDING * 2, []);

  const cellWidth = useMemo(() => {
    return (dockWidth - H_PADDING * 2) / tabCount;
  }, [dockWidth, tabCount]);

  const position = useRef(new Animated.Value(state.index)).current;
  const pillScale = useRef(new Animated.Value(1)).current;
  const glossShift = useRef(new Animated.Value(0)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  // dock glow
  const glowPulse = useRef(new Animated.Value(0)).current;
  // active pill glow
  const activeGlowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: state.index,
      tension: 125,
      friction: 16,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.spring(pillScale, {
        toValue: 1.045,
        tension: 220,
        friction: 16,
        useNativeDriver: true,
      }),
      Animated.spring(pillScale, {
        toValue: 1,
        tension: 220,
        friction: 18,
        useNativeDriver: true,
      }),
    ]).start();

    glossShift.setValue(-18);
    Animated.timing(glossShift, {
      toValue: 18,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    state.routes.forEach((_, i) => {
      Animated.spring(iconScales[i], {
        toValue: i === state.index ? 1.08 : 1,
        tension: 220,
        friction: 18,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index, position, pillScale, glossShift, iconScales, state.routes]);

  useEffect(() => {
    const dockGlowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    const pillGlowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(activeGlowPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(activeGlowPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    dockGlowLoop.start();
    pillGlowLoop.start();

    return () => {
      dockGlowLoop.stop();
      pillGlowLoop.stop();
    };
  }, [glowPulse, activeGlowPulse]);

  const pillTranslateX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => H_PADDING + i * cellWidth + (cellWidth - TAB_SIZE) / 2
    ),
  });

  const dockGlowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.3],
  });

  const dockGlowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.99, 1.025],
  });

  const pillGlowOpacity = activeGlowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.38],
  });

  const pillGlowScale = activeGlowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
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
        {/* soft purple outer glow */}
        <AnimatedView
          pointerEvents="none"
          style={[
            styles.dockGlow,
            {
              width: dockWidth + 18,
              height: dockHeight + 18,
              borderRadius: DOCK_RADIUS + 12,
              opacity: dockGlowOpacity,
              transform: [{ scale: dockGlowScale }],
            },
          ]}
        />

        <BlurView intensity={95} tint="light" style={styles.dock}>
          <View pointerEvents="none" style={styles.baseFill} />

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.95)',
              'rgba(255,255,255,0.45)',
              'rgba(255,255,255,0.10)',
              'rgba(255,255,255,0.00)',
            ]}
            locations={[0, 0.18, 0.42, 1]}
            style={styles.topReflection}
          />

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.00)',
              'rgba(210,210,220,0.00)',
              'rgba(185,188,205,0.10)',
              'rgba(135,138,155,0.18)',
            ]}
            locations={[0, 0.45, 0.75, 1]}
            style={styles.bottomLens}
          />

          <View pointerEvents="none" style={styles.outerStroke} />
          <View pointerEvents="none" style={styles.innerEmboss} />

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(0,0,0,0.00)',
              'rgba(0,0,0,0.00)',
              'rgba(0,0,0,0.025)',
              'rgba(0,0,0,0.055)',
            ]}
            locations={[0, 0.52, 0.8, 1]}
            style={styles.innerShadow}
          />

          <AnimatedView
            pointerEvents="none"
            style={[
              styles.pill,
              {
                width: TAB_SIZE,
                height: TAB_SIZE,
                transform: [{ translateX: pillTranslateX }, { scale: pillScale }],
              },
            ]}
          >
            {/* active pill purple glow */}
            <AnimatedView
              style={[
                styles.pillGlow,
                {
                  opacity: pillGlowOpacity,
                  transform: [{ scale: pillGlowScale }],
                },
              ]}
            />

            <View style={styles.pillHalo} />

            <BlurView intensity={100} tint="light" style={styles.pillBlur}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.96)',
                  'rgba(255,255,255,0.72)',
                  'rgba(255,255,255,0.38)',
                ]}
                locations={[0, 0.46, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.pillTint} />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,1.0)',
                  'rgba(255,255,255,0.56)',
                  'rgba(255,255,255,0.06)',
                  'rgba(255,255,255,0.00)',
                ]}
                locations={[0, 0.22, 0.55, 1]}
                style={styles.pillTopGlint}
              />

              <AnimatedView
                style={[
                  styles.specularWrap,
                  { transform: [{ translateX: glossShift }, { rotate: '-14deg' }] },
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.00)',
                    'rgba(255,255,255,0.70)',
                    'rgba(255,255,255,0.00)',
                  ]}
                  locations={[0, 0.5, 1]}
                  style={styles.specular}
                />
              </AnimatedView>

              <View style={styles.pillEmbossTop} />

              <LinearGradient
                colors={[
                  'rgba(0,0,0,0.00)',
                  'rgba(0,0,0,0.00)',
                  'rgba(0,0,0,0.035)',
                  'rgba(0,0,0,0.08)',
                ]}
                locations={[0, 0.5, 0.78, 1]}
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

  dockGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(126,70,255,0.28)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
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
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 22,
    overflow: 'hidden',
  },

  baseFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  topReflection: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '56%',
    borderTopLeftRadius: DOCK_RADIUS,
    borderTopRightRadius: DOCK_RADIUS,
  },

  bottomLens: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    borderBottomLeftRadius: DOCK_RADIUS,
    borderBottomRightRadius: DOCK_RADIUS,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 0.85,
    borderColor: 'rgba(255,255,255,0.62)',
  },

  innerEmboss: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: DOCK_RADIUS - 1,
    borderWidth: 0.7,
    borderTopColor: 'rgba(255,255,255,0.42)',
    borderLeftColor: 'rgba(255,255,255,0.26)',
    borderRightColor: 'rgba(255,255,255,0.12)',
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

  pill: {
    position: 'absolute',
    top: V_PADDING,
    borderRadius: 20,
    overflow: 'visible',
  },

  pillGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    backgroundColor: 'rgba(126,70,255,0.30)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },

  pillHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },

  pillBlur: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  pillTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95,47,153,0.09)',
  },

  pillTopGlint: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 1,
    height: '52%',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },

  specularWrap: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    width: 22,
    left: 10,
    opacity: 0.65,
  },

  specular: {
    flex: 1,
    borderRadius: 18,
  },

  pillEmbossTop: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 1,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.78)',
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
    borderWidth: 0.75,
    borderTopColor: 'rgba(255,255,255,0.66)',
    borderLeftColor: 'rgba(255,255,255,0.34)',
    borderRightColor: 'rgba(255,255,255,0.20)',
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
          backdropFilter: 'blur(30px) saturate(190%)',
          WebkitBackdropFilter: 'blur(30px) saturate(190%)',
        } as any)
      : {}),
  },
});