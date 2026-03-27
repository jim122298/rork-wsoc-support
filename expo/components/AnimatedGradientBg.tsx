import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnimatedGradientBg() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -80],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -40, 0],
  });

  const opacity1 = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7],
  });

  const opacity2 = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.6, 1],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F5F5F7' }]} />
      <Animated.View
        style={[
          styles.gradientLayer,
          {
            opacity: opacity1,
            transform: [{ translateX }, { translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(97, 52, 147, 0.08)', 'rgba(61, 124, 224, 0.06)', 'rgba(3, 131, 135, 0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.gradientLayer2,
          {
            opacity: opacity2,
            transform: [
              { translateX: Animated.multiply(translateX, -1) },
              { translateY: Animated.multiply(translateY, -1) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(3, 131, 135, 0.07)', 'rgba(97, 52, 147, 0.05)', 'rgba(61, 124, 224, 0.08)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientLayer: {
    position: 'absolute' as const,
    top: -60,
    left: -60,
    right: -60,
    bottom: -60,
  },
  gradientLayer2: {
    position: 'absolute' as const,
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
  },
});
