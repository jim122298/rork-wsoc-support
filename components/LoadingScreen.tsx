import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Image,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TIPS = [
  "Tip: Don't share passwords in tickets or screenshots.",
  'Tip: Use multi-factor authentication when available.',
  'Tip: Verify links before you sign in.',
  "Tip: Don't approve unexpected sign-in prompts.",
  'Tip: Lock your device when you step away.',
  'Tip: Keep updates turned on.',
  'Tip: Report suspicious pop-ups to IT.',
  'Tip: Avoid sending client info in support requests.',
];

interface LoadingScreenProps {
  onFinish: () => void;
  duration?: number;
}

export default function LoadingScreen({ onFinish, duration = 6000 }: LoadingScreenProps) {
  const fadeOut = useRef(new Animated.Value(1)).current;
  const [tipIndex, setTipIndex] = useState<number>(0);
  const tipOpacity = useRef(new Animated.Value(1)).current;

  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const shimmer = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const tipInterval = setInterval(() => {
      Animated.timing(tipOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTipIndex((prev) => (prev + 1) % TIPS.length);
        Animated.timing(tipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    Animated.timing(progressWidth, {
      toValue: 1,
      duration: duration - 400,
      useNativeDriver: false,
    }).start();

    const dismissTimer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, duration);

    return () => {
      clearInterval(tipInterval);
      clearTimeout(dismissTimer);
    };
  }, []);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 40],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <View style={styles.bgGradientTop} />
      <View style={styles.bgGradientBottom} />

      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: cardScale }],
            opacity: cardOpacity,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.cardShimmer,
            {
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        />

        <View style={styles.cardInnerBorder} />

        <View style={styles.loaderContainer}>
          <Image
            source={{ uri: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzB0c2Vydmd6eTJ6ZXVoMDZzMG5obGM4ZzN4d2VxODN4aXczeXY1OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SpkRfu9eoAHCiVd5Mo/giphy.gif' }}
            style={styles.loaderGif}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.progressBarContainer, { opacity: cardOpacity }]}> 
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.tipContainer, { opacity: tipOpacity }]}>
        <Text style={styles.tipText} numberOfLines={1}>
          {TIPS[tipIndex]}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.7, 300);
const CARD_HEIGHT = CARD_WIDTH * 1.05;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    backgroundColor: '#F2F1F6',
  },
  bgGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#F7F6FA',
    borderBottomLeftRadius: SCREEN_HEIGHT * 0.3,
    borderBottomRightRadius: SCREEN_HEIGHT * 0.3,
  },
  bgGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35,
    backgroundColor: '#EDEAF2',
    borderTopLeftRadius: SCREEN_HEIGHT * 0.4,
    borderTopRightRadius: SCREEN_HEIGHT * 0.4,
  },
  decorCircle1: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(97, 52, 147, 0.04)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.18,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(97, 52, 147, 0.03)',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 12,
  },
  cardShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 28,
  },
  cardInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderGif: {
    width: 140,
    height: 140,
  },
  progressBarContainer: {
    marginTop: 28,
    width: CARD_WIDTH * 0.75,
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(97, 52, 147, 0.35)',
  },
  tipContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.14,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  tipText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    letterSpacing: 0.2,
  },
});
