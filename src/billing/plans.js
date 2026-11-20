// Pelan langganan dan had setiap tier. Fungsi tulen supaya boleh diuji dengan node.

export const PRODUCTS = {
  plus: 'kiragaji_plus',
  pro: 'kiragaji_pro',
};

// ID base plan dalam Play Console (sama untuk kedua-dua produk)
export const BASE_PLANS = { yearly: 'tahunan', monthly: 'bulanan' };

// Harga sandaran bila kedai belum dimuat (cth. tiada internet). Harga sebenar datang dari Google Play.
export const FALLBACK_PRICES = {
  plus: { yearly: 'RM19.90', monthly: 'RM2.90' },
  pro: { yearly: 'RM39.90', monthly: 'RM4.90' },
};

export const TIERS = ['free', 'plus', 'pro'];

export const LIMITS = {
  free: { receiptsPerYear: 10, pdf: 'reward', ads: true, reminders: false, profiles: 1, excel: false },
  plus: { receiptsPerYear: Infinity, pdf: 'unlimited', ads: false, reminders: true, profiles: 1, excel: false },
  pro: { receiptsPerYear: Infinity, pdf: 'unlimited', ads: false, reminders: true, profiles: 2, excel: true },
};

export const TIER_LABEL = { free: 'Percuma', plus: 'Plus', pro: 'Pro' };

// Senarai ciri untuk skrin langganan. `soon` = belum siap, dipaparkan sebagai "akan datang".
export const FEATURES = [
  { key: 'ads', label: 'Tanpa iklan', plus: true, pro: true },
  { key: 'receipts', label: 'Resit tanpa had', plus: true, pro: true },
  { key: 'pdf', label: 'PDF A4 tanpa had', plus: true, pro: true },
  { key: 'reminders', label: 'Peringatan simpan resit', plus: true, pro: true },
  { key: 'profiles', label: '2 profil: anda dan pasangan', plus: false, pro: true },
  { key: 'excel', label: 'Eksport Excel untuk ejen cukai', plus: false, pro: true },
  { key: 'backup', label: 'Sandaran Google Drive', plus: false, pro: true, soon: true },
  { key: 'ocr', label: 'Baca resit automatik', plus: false, pro: true, soon: true },
];

export const tierRank = (t) => Math.max(0, TIERS.indexOf(t));
export const atLeast = (tier, needed) => tierRank(tier) >= tierRank(needed);
export const limitsFor = (tier) => LIMITS[tier] || LIMITS.free;

// Tier aktif daripada senarai pembelian Google Play
export function tierFromPurchases(purchases = []) {
  const ids = purchases.filter((p) => p && p.purchaseState !== 'pending').map((p) => p.productId || p.id);
  if (ids.includes(PRODUCTS.pro)) return 'pro';
  if (ids.includes(PRODUCTS.plus)) return 'plus';
  return 'free';
}

// Boleh tambah resit lagi tahun ini?
export function canAddReceipt(tier, countThisYear) {
  return countThisYear < limitsFor(tier).receiptsPerYear;
}

export function receiptsLeft(tier, countThisYear) {
  const max = limitsFor(tier).receiptsPerYear;
  return max === Infinity ? Infinity : Math.max(0, max - countThisYear);
}

// Pengguna percuma dapat 1 PDF setiap tahun selepas menonton iklan.
// `rewards` = { [tahun]: bilangan PDF yang sudah dibuka }
export function pdfAccess(tier, year, rewards = {}) {
  if (limitsFor(tier).pdf === 'unlimited') return 'allowed';
  return (rewards[year] || 0) > 0 ? 'allowed' : 'needs-reward';
}

// Pilih tawaran untuk base plan: utamakan tawaran pembangun (percubaan / pelancaran) jika layak.
// Google Play hanya memulangkan tawaran yang pengguna layak terima.
export function pickOffer(product, basePlanId) {
  const offers = (product?.subscriptionOffers || []).filter((o) => o.basePlanIdAndroid === basePlanId);
  if (!offers.length) return null;
  const special = offers.find((o) => o.id && o.id !== basePlanId && o.offerTokenAndroid);
  return special || offers.find((o) => o.offerTokenAndroid) || offers[0];
}

// Ada percubaan percuma dalam tawaran ini?
export function hasFreeTrial(offer) {
  if (!offer) return false;
  if (offer.paymentMode === 'free-trial' || offer.paymentMode === 'FreeTrial') return true;
  const phases = offer.pricingPhasesAndroid?.pricingPhaseList || [];
  return phases.some((p) => String(p.priceAmountMicros) === '0');
}

// Harga yang dipaparkan: harga berulang (fasa terakhir), bukan harga percubaan
export function recurringPrice(offer, fallback) {
  const phases = offer?.pricingPhasesAndroid?.pricingPhaseList || [];
  const last = phases[phases.length - 1];
  return last?.formattedPrice || offer?.displayPrice || fallback;
}

export function introPrice(offer) {
  const phases = offer?.pricingPhasesAndroid?.pricingPhaseList || [];
  const paid = phases.filter((p) => String(p.priceAmountMicros) !== '0');
  return paid.length > 1 ? paid[0].formattedPrice : null;
}
