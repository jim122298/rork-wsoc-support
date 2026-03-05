import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Headset, MessageCircle, Grid3x3, Bookmark, Ellipsis } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  '(home)': Headset,
  scanner: MessageCircle,
  categories: Grid3x3,
  bookmarks: Bookmark,
  settings: Ellipsis,
};

const ACCENT = '#5F2F99';
const INACTIVE = 'rgba(0,0,0,0.70)';

const TAB_SIZE = 48;                  // smaller = more Apple
const DOCK_RADIUS = 28;
const DOCK_HORIZONTAL_PADDING = 12;
const DOCK_VERTICAL_PADDING = 10;
const GAP = 8;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;

  const dockWidth = useMemo(() => {
    return Math.min(
      SCREEN_WIDTH - 28,
      tabCount * TAB_SIZE + (tabCount - 1) * GAP + DOCK_HORIZONTAL_PADDING * 2
    );
  }, [tabCount]);

  const cellWidth = useMemo(() => {
    return (dockWidth - DOCK_HORIZONTAL_PADDING * 2) / tabCount;
  }, [dockWidth, tabCount]);

  const pillAnim = useRef(new Animated.Value(state.index)).current;
  const pillScale = useRef(new Animated.Value(1)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: state.index,
      tension: 110,
      friction: 16,
      useNativeDriver: true,
    }).start();

    // gentle “liquid” swell, subtle (not cartoony)
    Animated.sequence([
      Animated.spring(pillScale, {
        toValue: 1.03,
        tension: 260,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(pillScale, {
        toValue: 1,
        tension: 260,
        friction: 22,
        useNativeDriver: true,
      }),
    ]).start();

    state.routes.forEach((_, i) => {
      const focused = i === state.index;
      Animated.spring(iconScales[i], {
        toValue: focused ? 1.07 : 1,
        tension: 240,
        friction: 18,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  const pillTranslateX = pillAnim.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => DOCK_HORIZONTAL_PADDING + i * cellWidth + (cellWidth - TAB_SIZE) / 2
    ),
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
      style={[styles.dockOuter, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      <View style={[styles.dockWrap, { width: dockWidth }]}>
        {/* Base glass */}
        <BlurView intensity={55} tint="light" style={styles.dockGlass}>
          {/* hairline border (Apple-like) */}
          <View pointerEvents="none" style={styles.hairline} />

          {/* moving “liquid glass” selection */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectionBlob,
              {
                width: TAB_SIZE,
                height: TAB_SIZE,
                transform: [
                  { translateX: pillTranslateX },
                  { scale: pillScale },
                ],
              },
            ]}
          >
            {/* selection is also blurred, but FLAT (no bevel highlight) */}
            <BlurView intensity={80} tint="light" style={styles.selectionBlur}>
              <View style={styles.selectionTint} />
              <View style={styles.selectionStroke} />
            </BlurView>
          </Animated.View>

          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const IconComp = ICON_MAP[route.name] || Ellipsis;
              const color = isFocused ? ACCENT : INACTIVE;

              return (
                <Pressable
                  key={route.key}
                  onPress={() => handleTabPress(route.key, route.name, isFocused)}
                  style={styles.tabButton}
                  testID={`tab-${route.name}`}
                >
                  <Animated.View style={{ transform: [{ scale: iconScales[index] }] }}>
                    <IconComp size={19} color={color} />
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        </BlurView>

        {/* Web fallback (BlurView can be meh on web preview) */}
        {Platform.OS === 'web' ? <View pointerEvents="none" style={styles.webFallback} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  dockWrap: {
    borderRadius: DOCK_RADIUS,
    overflow: 'hidden',
  },

  dockGlass: {
    borderRadius: DOCK_RADIUS,
    paddingVertical: DOCK_VERTICAL_PADDING,
    paddingHorizontal: DOCK_HORIZONTAL_PADDING,
    backgroundColor: 'rgba(255,255,255,0.35)', // keep subtle; blur does the work
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 16,
  },

  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },

  selectionBlob: {
    position: 'absolute',
    top: DOCK_VERTICAL_PADDING,
    borderRadius: 18,
    overflow: 'hidden',
  },
  selectionBlur: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  // flat tint, no bevel
  selectionTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95,47,153,0.12)',
  },
  // subtle edge so it reads as “material”, not button
  selectionStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },

  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GAP,
  },
  tabButton: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderRadius: DOCK_RADIUS,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        } as any)
      : {}),
  },
});