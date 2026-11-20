// Google Play Billing melalui react-native-iap. Modul native hanya wujud dalam development build,
// jadi ia dimuat secara lembut: dalam Expo Go, web atau ujian, app kekal pada tier Percuma.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PRODUCTS, tierFromPurchases } from './plans';

let IAP = null;
try {
  IAP = Platform.OS === 'android' ? require('react-native-iap') : null;
} catch {
  IAP = null;
}

const CACHE_KEY = 'kiragaji.tier.v1';
const PACKAGE = 'com.rickyazwan.kiragaji';
const SKUS = [PRODUCTS.plus, PRODUCTS.pro];

let connected = false;

export const billingAvailable = () => !!IAP;

async function connect() {
  if (!IAP) return false;
  if (connected) return true;
  try {
    connected = !!(await IAP.initConnection());
  } catch {
    connected = false;
  }
  return connected;
}

export async function cachedTier() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v?.tier || 'free';
  } catch {
    return 'free';
  }
}

async function saveTier(tier) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ tier, at: Date.now() }));
  } catch {
    // abaikan
  }
}

// Akui pembelian dalam masa 3 hari, jika tidak Google bayar balik secara automatik
async function acknowledge(purchase) {
  try {
    if (purchase && purchase.purchaseState === 'purchased' && !purchase.isAcknowledgedAndroid) {
      await IAP.finishTransaction({ purchase, isConsumable: false });
    }
  } catch {
    // cuba lagi pada pelancaran seterusnya
  }
}

// Semak langganan aktif. Jika kedai tidak dapat dihubungi, guna tier terakhir yang diketahui.
export async function refreshTier() {
  if (!(await connect())) return cachedTier();
  try {
    const purchases = (await IAP.getAvailablePurchases()) || [];
    const mine = purchases.filter((p) => SKUS.includes(p.productId));
    for (const p of mine) await acknowledge(p);
    const tier = tierFromPurchases(mine);
    await saveTier(tier);
    return tier;
  } catch {
    return cachedTier();
  }
}

export async function loadProducts() {
  if (!(await connect())) return {};
  try {
    const list = (await IAP.fetchProducts({ skus: SKUS, type: 'subs' })) || [];
    const out = {};
    for (const p of list) {
      if (p.id === PRODUCTS.plus) out.plus = p;
      if (p.id === PRODUCTS.pro) out.pro = p;
    }
    return out;
  } catch {
    return {};
  }
}

// Dengar pembelian baharu (termasuk yang selesai selepas app ditutup)
export function listenPurchases(onTier, onError) {
  if (!IAP) return () => {};
  const a = IAP.purchaseUpdatedListener(async (purchase) => {
    if (!SKUS.includes(purchase?.productId)) return;
    await acknowledge(purchase);
    onTier(await refreshTier());
  });
  const b = IAP.purchaseErrorListener((e) => onError?.(e));
  return () => {
    a?.remove?.();
    b?.remove?.();
  };
}

// Mulakan aliran langganan Google Play.
// `current` = { token, productId } langganan sedia ada, untuk naik / turun taraf antara Plus dan Pro.
export async function subscribe(sku, offer, current) {
  if (!(await connect())) throw new Error('Google Play tidak tersedia');
  const google = { skus: [sku], subscriptionOffers: offer?.offerTokenAndroid ? [{ sku, offerToken: offer.offerTokenAndroid }] : [] };
  if (current?.token && current.productId !== sku) {
    google.purchaseToken = current.token;
    google.subscriptionProductReplacementParams = { oldProductId: current.productId, replacementMode: 'with-time-proration' };
  }
  return IAP.requestPurchase({ type: 'subs', request: { google } });
}

export async function currentSubscription() {
  if (!(await connect())) return null;
  try {
    const purchases = (await IAP.getAvailablePurchases()) || [];
    const p = purchases.find((x) => SKUS.includes(x.productId));
    return p ? { token: p.purchaseToken, productId: p.productId } : null;
  } catch {
    return null;
  }
}

// Buka halaman Langganan Google Play (wajib ada untuk membatalkan)
export async function manageSubscriptions(sku) {
  try {
    if (IAP) return await IAP.deepLinkToSubscriptions({ packageNameAndroid: PACKAGE, skuAndroid: sku || undefined });
  } catch {
    // jatuh ke pautan biasa
  }
  const { Linking } = require('react-native');
  return Linking.openURL(`https://play.google.com/store/account/subscriptions?package=${PACKAGE}${sku ? `&sku=${sku}` : ''}`);
}
