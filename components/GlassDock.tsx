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

const ACTIVE = '#4E2B87';
const INACTIVE = 'rgba(22,22,28,0.62)';

const TAB_SIZE = 50;
const ACTIVE_SIZE = 42;
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

  const position = useRef(new Animated.Value(state.index)).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const bubbleGlow = useRef(new Animated.Value(0.7)).current;
  const sheenX = useRef(new Animated.Value(-18)).current;

  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const iconY = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const iconOpacity = useRef(state.routes.map(() => new Animated.Value(0.78))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(position, {
        toValue: state.index,
        tension: 120,
        friction: 16,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(bubbleScale, {
          toValue: 1.06,
          tension: 220,
          friction: 16,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(bubbleGlow, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bubbleGlow, {
          toValue: 0.76,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    sheenX.setValue(-18);
    Animated.sequence([
      Animated.timing(sheenX, {
        toValue: 12,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheenX, {
        toValue: 6,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

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
  }, [state.index, position, bubbleScale, bubbleGlow, sheenX, iconScales, iconY, iconOpacity, state.routes]);

  const bubbleTranslateX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => {
      const itemX = leadingOffset + i * (TAB_SIZE + GAP);
      return itemX + (TAB_SIZE - ACTIVE_SIZE) / 2;
    }),
  });

  const glowOpacity = bubbleGlow.interpolate({
    inputRange: [0.7, 1],
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

          <View pointerEvents="none" style={styles.outerStroke} />
          <View pointerEvents="none" style={styles.innerStroke} />

          <View pointerEvents="none" style={styles.reflectionBandWrap}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.10)',
                'rgba(255,255,255,0.26)',
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0)',
              ]}
              locations={[0, 0.18, 0.5, 0.78, 1]}
              style={styles.reflectionBand}
            />
          </View>

          <AnimatedView
            pointerEvents="none"
            style={[
              styles.bubbleWrap,
              {
                width: ACTIVE_SIZE,
                height: ACTIVE_SIZE,
                transform: [{ translateX: bubbleTranslateX }, { scale: bubbleScale }],
              },
            ]}
          >
            <AnimatedView style={[styles.bubbleGlow, { opacity: glowOpacity }]} />

            <BlurView intensity={100} tint="light" style={styles.bubble}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.95)',
                  'rgba(255,255,255,0.74)',
                  'rgba(255,255,255,0.28)',
                ]}
                locations={[0, 0.42, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.bubbleTint} />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,0.58)',
                  'rgba(255,255,255,0.00)',
                ]}
                locations={[0, 0.34, 1]}
                style={styles.bubbleHighlight}
              />

              <AnimatedView
                style={[
                  styles.bubbleSheen,
                  { transform: [{ translateX: sheenX }, { rotate: '-16deg' }] },
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0)',
                    'rgba(255,255,255,0.78)',
                    'rgba(255,255,255,0)',
                  ]}
                  locations={[0, 0.5, 1]}
                  style={styles.bubbleSheenGradient}
                />
              </AnimatedView>

              <View style={styles.bubbleInnerStroke} />
              <View style={styles.bubbleOuterStroke} />
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

  bubbleWrap: {
    position: 'absolute',
    top: V_PADDING + (TAB_SIZE - ACTIVE_SIZE) / 2,
    borderRadius: ACTIVE_SIZE / 2,
    overflow: 'visible',
  },

  bubbleGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ACTIVE_SIZE / 2 + 4,
    backgroundColor: 'rgba(126,70,255,0.24)',
    shadowColor: '#8B5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
  },

  bubble: {
    flex: 1,
    borderRadius: ACTIVE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.30)',
  },

  bubbleTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95,47,153,0.07)',
  },

  bubbleHighlight: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 2,
    height: '46%',
    borderTopLeftRadius: ACTIVE_SIZE / 2,
    borderTopRightRadius: ACTIVE_SIZE / 2,
  },

  bubbleSheen: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 7,
    width: 18,
    opacity: 0.6,
  },

  bubbleSheenGradient: {
    flex: 1,
    borderRadius: 14,
  },

  bubbleInnerStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: ACTIVE_SIZE / 2,
    borderWidth: 0.8,
    borderTopColor: 'rgba(255,255,255,0.58)',
    borderLeftColor: 'rgba(255,255,255,0.26)',
    borderRightColor: 'rgba(255,255,255,0.18)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  bubbleOuterStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ACTIVE_SIZE / 2,
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