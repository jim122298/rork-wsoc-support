import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
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

const LABEL_MAP: Record<string, string> = {
  '(home)': 'Support',
  scanner: 'Ask',
  categories: 'Articles',
  bookmarks: 'Saved',
  settings: 'More',
};

const ACTIVE_COLOR = '#007AFF';
const INACTIVE_COLOR = '#8E8E93';

const AnimatedView = Animated.View;

export default function GlassDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    state.routes.forEach((_, i) => {
      const focused = i === state.index;
      Animated.spring(iconScales[i], {
        toValue: focused ? 1 : 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index, iconScales, state.routes]);

  const handleTabPress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate(routeName as never);
      }
    },
    [navigation]
  );

  const handlePressIn = useCallback((index: number) => {
    Animated.spring(iconScales[index], {
      toValue: 0.85,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [iconScales]);

  const handlePressOut = useCallback((index: number) => {
    Animated.spring(iconScales[index], {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [iconScales]);

  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: bottomPadding }]}
    >
      <View style={styles.dockContainer}>
        <BlurView
          intensity={80}
          tint="systemChromeMaterialLight"
          style={styles.blurWrap}
        >
          <View style={styles.bgFill} />
          <View style={styles.topBorder} />

          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const Icon = ICON_MAP[route.name] || Ellipsis;
              const label = LABEL_MAP[route.name] || route.name;

              return (
                <Pressable
                  key={route.key}
                  onPress={() => handleTabPress(route.key, route.name, focused)}
                  onPressIn={() => handlePressIn(index)}
                  onPressOut={() => handlePressOut(index)}
                  style={styles.tab}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                  testID={`tab-${route.name}`}
                >
                  <AnimatedView
                    style={[
                      styles.iconWrap,
                      { transform: [{ scale: iconScales[index] }] },
                    ]}
                  >
                    <Icon
                      size={22}
                      color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
                      strokeWidth={focused ? 2 : 1.5}
                    />
                    <Text
                      style={[
                        styles.label,
                        { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR },
                        focused && styles.labelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </AnimatedView>
                </Pressable>
              );
            })}
          </View>
        </BlurView>

        {Platform.OS === 'web' && <View pointerEvents="none" style={styles.webFallback} />}
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
    zIndex: 100,
  },

  dockContainer: {
    overflow: 'hidden',
  },

  blurWrap: {
    overflow: 'hidden',
  },

  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 249, 249, 0.78)',
  },

  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingBottom: 2,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },

  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  label: {
    fontSize: 10,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
    marginTop: 1,
  },

  labelActive: {
    fontWeight: '600' as const,
  },

  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 249, 249, 0.88)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        } as any)
      : {}),
  },
});
