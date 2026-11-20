import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, useAnimatedValue } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Tahan splash natif sehingga app sedia (profil dimuat dari storan)
SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_BG = '#0B3D2E';
const LOGO = 180; // mesti sama dengan imageWidth dalam app.json supaya peralihan tidak "melompat"

/**
 * Lapisan splash yang sama rupa dengan splash natif. Bila `ready`, splash natif
 * disembunyikan di bawahnya, nama app muncul sekejap, kemudian keseluruhan
 * lapisan pudar dan logo membesar sedikit ke dalam app.
 */
export default function AnimatedSplash({ ready, onDone }) {
  const fade = useAnimatedValue(1);
  const scale = useAnimatedValue(1);
  const name = useAnimatedValue(0);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    Animated.sequence([
      Animated.timing(name, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(220),
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.12, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(() => onDone && onDone());
  }, [ready]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, st.wrap, { opacity: fade }]}
      accessibilityLabel="KIRA GAJI sedang dibuka"
    >
      <Animated.Image
        source={require('../../assets/splash-icon.png')}
        style={{ width: LOGO, height: LOGO, transform: [{ scale }] }}
        resizeMode="contain"
      />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: '30%',
          alignItems: 'center',
          opacity: name,
          transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }}
      >
        <Text style={st.name}>KIRA GAJI</Text>
        <Text style={st.tag}>GAJI · CUKAI · RESIT · ZAKAT</Text>
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },
  name: { color: '#ECF8F2', fontSize: 28, fontWeight: '800', letterSpacing: 3 },
  tag: { color: '#9FD4BE', fontSize: 12, fontWeight: '700', marginTop: 8, letterSpacing: 3 },
});
