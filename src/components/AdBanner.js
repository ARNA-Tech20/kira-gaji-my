import React from 'react';
import { View, Platform } from 'react-native';

// AdMob memerlukan development build (bukan Expo Go). Dalam Expo Go modul
// native tiada, jadi komponen ini senyap-senyap tidak memaparkan apa-apa.
let Ads = null;
try {
  Ads = require('react-native-google-mobile-ads');
} catch {
  Ads = null;
}

// GANTI dengan ID unit iklan sebenar dari AdMob sebelum terbit.
// Semasa pembangunan, ID ujian Google digunakan supaya akaun AdMob tidak digantung.
const PROD_BANNER_ID = 'ca-app-pub-0588853907996342/BANNER_BELUM_ADA';

export default function AdBanner({ hidden }) {
  if (hidden || !Ads || Platform.OS === 'web') return null;
  const { BannerAd, BannerAdSize, TestIds } = Ads;
  const unitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : PROD_BANNER_ID;

  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
