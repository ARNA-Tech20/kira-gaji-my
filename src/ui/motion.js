import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, Text, useAnimatedValue } from 'react-native';

// Nombor yang "mengira" dari nilai lama ke nilai baharu
export function AnimatedNumber({ value, format, style, duration = 450 }) {
  const anim = useAnimatedValue(value);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(v));
    Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value]);
  return (
    <Text style={style} accessible accessibilityLabel={format(value)}>
      {format(shown)}
    </Text>
  );
}

// Muncul perlahan dari bawah; beri `delay` berbeza untuk kesan berperingkat
export function FadeIn({ children, delay = 0, style }) {
  const a = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View
      style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

// Butang yang mengecil sedikit bila ditekan
export function PressableScale({ children, style, wrapStyle, onPress, disabled, accessibilityLabel, hitSlop }) {
  const s = useAnimatedValue(1);
  const to = (v) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      style={wrapStyle}
      hitSlop={hitSlop}
      onPress={onPress}
      onPressIn={() => to(0.96)}
      onPressOut={() => to(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }, disabled && { opacity: 0.5 }]}>{children}</Animated.View>
    </Pressable>
  );
}

// Satu segmen bar yang lebarnya beranimasi ke peratus baharu
export function BarSegment({ pct, color }) {
  const w = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct]);
  return (
    <Animated.View
      style={{ height: '100%', backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}
    />
  );
}
