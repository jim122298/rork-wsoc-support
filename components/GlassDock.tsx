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

const ACTIVE = '#ffffff';
const INACTIVE = 'rgba(255,255,255,0.58)';
const BAR_BG = '#cfd4de';
const BAR_TOP = '#e9edf3';
const BAR_BOTTOM = '#aeb5c2';
const BAR_BORDER = 'rgba(255,255,255,0.55)';
const BAR_SHADOW = 'rgba(0,0,0,0.28)';
const ACTIVE_DISC = '#7b4dff';

const TAB_HEIGHT = 58;
const ICON_SIZE = 20;
const ACTIVE_SIZE = 34;

const AnimatedView = Animated.View;

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const iconTranslateY = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const activeGlow = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const sheenAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    state.routes.forEach((_, i) => {
      const focused = i === state.index;

      Animated.parallel([
        Animated.spring(iconScales[i], {
          toValue: focused ? 1.08 : 1,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.spring(iconTranslateY[i], {
          toValue: focused ? -1 : 0,
          tension: 220,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.timing(activeGlow[i], {
          toValue: focused ? 1 : 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });

    sheenAnim.setValue(0);
    Animated.timing(sheenAnim, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start();
  }, [state.index, state.routes, iconScales, iconTranslateY, activeGlow, sheenAnim]);

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

  const sheenTranslateX = sheenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 220],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 0) }]}
    >
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        {/* old Mac style top lip */}
        <View pointerEvents="none" style={styles.topHighlight} />
        <View pointerEvents="none" style={styles.topHairline} />
        <View pointerEvents="none" style={styles.innerShadow} />

        {/* reflective sweep */}
        <AnimatedView
          pointerEvents="none"
          style={[
            styles.sheen,
            {
              transform: [{ translateX: sheenTranslateX }, { rotate: '-18deg' }],
            },
          ]}
        />

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const IconComp = ICON_MAP[route.name] || Ellipsis;

            const glowOpacity = activeGlow[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.22],
            });

            const glowScale = activeGlow[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1.15],
            });

            return (
              <Pressable
                key={route.key}
                onPress={() => handleTabPress(route.key, route.name, isFocused)}
                style={styles.tabButton}
                testID={`tab-${route.name}`}
              >
                <AnimatedView
                  pointerEvents="none"
                  style={[
                    styles.activeGlow,
                    {
                      opacity: glowOpacity,
                      transform: [{ scale: glowScale }],
                    },
                  ]}
                />

                {isFocused ? <View pointerEvents="none" style={styles.activeDisc} /> : null}

                <AnimatedView
                  style={{
                    transform: [
                      { scale: iconScales[index] },
                      { translateY: iconTranslateY[index] },
                    ],
                  }}
                >
                  <IconComp
                    size={ICON_SIZE}
                    color={isFocused ? ACTIVE : INACTIVE}
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

  dock: {
    height: TAB_HEIGHT + 8,
    backgroundColor: BAR_BG,
    borderTopWidth: 1,
    borderTopColor: BAR_BORDER,
    shadowColor: BAR_SHADOW,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 18,
    overflow: 'hidden',
  },

  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: BAR_TOP,
    opacity: 0.95,
  },

  topHairline: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  innerShadow: {
    position: 'absolute',
    top: 17,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: BAR_BOTTOM,
    opacity: 0.22,
  },

  sheen: {
    position: 'absolute',
    top: -18,
    bottom: -12,
    width: 64,
    backgroundColor: 'rgba(255,255,255,0.16)',
    opacity: 0.65,
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
    paddingTop: 8,
    paddingHorizontal: 10,
  },

  tabButton: {
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeDisc: {
    position: 'absolute',
    width: ACTIVE_SIZE,
    height: ACTIVE_SIZE,
    borderRadius: ACTIVE_SIZE / 2,
    backgroundColor: ACTIVE_DISC,
    opacity: 0.9,
    shadowColor: ACTIVE_DISC,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
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
    backgroundColor: BAR_BG,
  },
});