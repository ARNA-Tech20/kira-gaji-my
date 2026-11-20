// Iklan berganjaran: pengguna percuma tonton satu iklan untuk buka 1 PDF setahun.
import { Platform } from 'react-native';

let Ads = null;
try {
  Ads = Platform.OS === 'web' ? null : require('react-native-google-mobile-ads');
} catch {
  Ads = null;
}

// GANTI dengan ID unit rewarded sebenar dari AdMob sebelum terbit.
const PROD_REWARDED_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ';

// Pulangkan 'earned' | 'closed' | 'unavailable'
export function showRewardedAd(timeoutMs = 12000) {
  if (!Ads?.RewardedAd) return Promise.resolve('unavailable');
  const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = Ads;
  const ad = RewardedAd.createForAdRequest(__DEV__ ? TestIds.REWARDED : PROD_REWARDED_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  return new Promise((resolve) => {
    let earned = false;
    let done = false;
    const subs = [];
    const finish = (v) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      subs.forEach((u) => u && u());
      resolve(v);
    };
    const timer = setTimeout(() => finish('unavailable'), timeoutMs);
    subs.push(ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(timer);
      ad.show().catch(() => finish('unavailable'));
    }));
    subs.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    }));
    subs.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'earned' : 'closed')));
    subs.push(ad.addAdEventListener(AdEventType.ERROR, () => finish('unavailable')));
    ad.load();
  });
}
