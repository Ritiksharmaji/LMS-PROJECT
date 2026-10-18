import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  type ViewStyle,
} from 'react-native';

/** A ring that slowly turns, carrying small "satellite" dots — the brand's orbit motif. Still when Reduce Motion is on. */
export function OrbitRing({
  size,
  color,
  dashed,
  duration = 40000,
  reverse,
  satellites = [],
  style,
}: {
  size: number;
  color: string;
  dashed?: boolean;
  duration?: number;
  reverse?: boolean;
  satellites?: { angle: number; color: string; size?: number }[];
  style?: ViewStyle;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [spin, duration]);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
          borderStyle: dashed ? 'dashed' : 'solid',
          transform: [{ rotate }],
        },
        style,
      ]}
    >
      {satellites.map((s, i) => {
        const d = s.size ?? 10;
        const rad = (s.angle * Math.PI) / 180;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: s.color,
              left: size / 2 + (size / 2) * Math.cos(rad) - d / 2 - 0.75,
              top: size / 2 + (size / 2) * Math.sin(rad) - d / 2 - 0.75,
            }}
          />
        );
      })}
    </Animated.View>
  );
}

/** Gentle up-and-down float for decorative cards. */
export function Float({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) return;
      const ease = Easing.inOut(Easing.sin);
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(y, {
            toValue: -8,
            duration: 3000,
            easing: ease,
            useNativeDriver: true,
          }),
          Animated.timing(y, {
            toValue: 0,
            duration: 3000,
            easing: ease,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [y, delay]);
  return (
    <Animated.View style={[style, { transform: [{ translateY: y }] }]}>
      {children}
    </Animated.View>
  );
}
