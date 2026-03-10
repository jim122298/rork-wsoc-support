import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
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

const BAR_HEIGHT = 62;
const ACTIVE_SIZE = 36;
const ICON_SIZE = 19;

const ACTIVE_ICON = '#ffffff';
const INACTIVE_ICON = 'rgba(255,255,255,0.62)';

const BAR_TOP = '#d7dce5';
const BAR_MID = '#b8bec9';
const BAR_BOTTOM = '#8d95a3';

const ACTIVE_DISC = '#6f48ff';

const AnimatedView = Animated.View;

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const iconScale = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const iconY = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const iconOpacity = useRef(state.routes.map(() => new Animated.Value(0.8))).current;
  const glowOpacity = useRef(state.routes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    state.routes.forEach((_, i) => {
      const focused = i === state.index;

      Animated.parallel([
        Animated.spring(iconScale[i], {
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
          toValue: focused ? 1 : 0.74,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity[i], {
          toValue: focused ? 1 : 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [state.index, state.routes, glowOpacity, iconOpacity, iconScale, iconY]);

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
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 0) }]}
    >
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        <LinearGradient
          pointerEvents="none"
          colors={[BAR_TOP, BAR_MID, BAR_BOTTOM]}
          locations={[0, 0.38, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* top shine */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(255,255,255,0.75)',
            'rgba(255,255,255,0.28)',
            'rgba(255,255,255,0.00)',
          ]}
          locations={[0, 0.32, 1]}
          style={styles.topShine}
        />

        {/* dark lower shelf feel */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(0,0,0,0.00)',
            'rgba(0,0,0,0.04)',
            'rgba(0,0,0,0.10)',
          ]}
          locations={[0, 0.6, 1]}
          style={styles.bottomShade}
        />

        <View pointerEvents="none" style={styles.topHairline} />
        <View pointerEvents="none" style={styles.bottomHairline} />

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const Icon = ICON_MAP[route.name] || Ellipsis;

            return (
              <Pressable
                key={route.key}
                onPress={() => handleTabPress(route.key, route.name, focused)}
                style={styles.tabButton}
                testID={`tab-${route.name}`}
              >
                <AnimatedView
                  pointerEvents="none"
                  style={[
                    styles.activeGlow,
                    {
                      opacity: glowOpacity[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.22],
                      }),
                      transform: [
                        {
                          scale: glowOpacity[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1.12],
                          }),
                        },
                      ],
                    },
                  ]}
                />

                {focused ? <View pointerEvents="none" style={styles.activeDisc} /> : null}

                <AnimatedView
                  style={{
                    opacity: iconOpacity[index],
                    transform: [
                      { scale: iconScale[index] },
                      { translateY: iconY[index] },
                    ],
                  }}
                >
                  <Icon
                    size={ICON_SIZE}
                    color={focused ? ACTIVE_ICON : INACTIVE_ICON}
                    strokeWidth={2.2}
                  />
                </AnimatedView>
              </Pressable>
            );
          })}
        </View>
      </View>

      {Platform.OS === 'web' ? <View pointerEvents="none" style={styles.webFallback} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },

  bar: {
    height: BAR_HEIGHT + 8,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 16,
  },

  topShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
  },

  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
  },

  topHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  bottomHairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
    paddingTop: 8,
    paddingHorizontal: 8,
  },

  tabButton: {
    width: 58,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeDisc: {
    position: 'absolute',
    width: ACTIVE_SIZE,
    height: ACTIVE_SIZE,
    borderRadius: ACTIVE_SIZE / 2,
    backgroundColor: ACTIVE_DISC,
    shadowColor: ACTIVE_DISC,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },

  activeGlow: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACTIVE_DISC,
  },

  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BAR_MID,
  },
});
