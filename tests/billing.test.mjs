import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { canAddReceipt, receiptsLeft, pdfAccess, tierFromPurchases, pickOffer, hasFreeTrial, recurringPrice, introPrice, atLeast, LIMITS } from '../src/billing/plans.js';
import { buildReceiptsXlsx, toBase64 } from '../src/export/xlsx.js';

test('had resit ikut tier', () => {
  assert.equal(canAddReceipt('free', 9), true);
  assert.equal(canAddReceipt('free', 10), false);
  assert.equal(canAddReceipt('plus', 500), true);
  assert.equal(receiptsLeft('free', 7), 3);
  assert.equal(receiptsLeft('pro', 7), Infinity);
  assert.equal(LIMITS.pro.profiles, 2);
  assert.ok(atLeast('pro', 'plus') && !atLeast('plus', 'pro'));
});

test('PDF percuma perlu iklan sekali setahun', () => {
  assert.equal(pdfAccess('free', 2026, {}), 'needs-reward');
  assert.equal(pdfAccess('free', 2026, { 2026: 1 }), 'allowed');
  assert.equal(pdfAccess('free', 2027, { 2026: 1 }), 'needs-reward');
  assert.equal(pdfAccess('plus', 2026, {}), 'allowed');
});

test('tier daripada pembelian Google Play', () => {
  assert.equal(tierFromPurchases([]), 'free');
  assert.equal(tierFromPurchases([{ productId: 'kiragaji_plus', purchaseState: 'purchased' }]), 'plus');
  assert.equal(tierFromPurchases([{ productId: 'kiragaji_plus' }, { productId: 'kiragaji_pro' }]), 'pro');
  assert.equal(tierFromPurchases([{ productId: 'kiragaji_pro', purchaseState: 'pending' }]), 'free');
  assert.equal(tierFromPurchases([{ productId: 'lain' }]), 'free');
});

test('pilih tawaran: utamakan percubaan / pelancaran', () => {
  const phase = (p, m) => ({ formattedPrice: p, priceAmountMicros: m });
  const product = {
    subscriptionOffers: [
      { id: 'tahunan', basePlanIdAndroid: 'tahunan', offerTokenAndroid: 'base', displayPrice: 'RM39.90', pricingPhasesAndroid: { pricingPhaseList: [phase('RM39.90', '39900000')] } },
      {
        id: 'pelancaran', basePlanIdAndroid: 'tahunan', offerTokenAndroid: 'intro', displayPrice: 'RM0',
        pricingPhasesAndroid: { pricingPhaseList: [phase('Percuma', '0'), phase('RM29.90', '29900000'), phase('RM39.90', '39900000')] },
      },
      { id: 'bulanan', basePlanIdAndroid: 'bulanan', offerTokenAndroid: 'm', displayPrice: 'RM4.90' },
    ],
  };
  const o = pickOffer(product, 'tahunan');
  assert.equal(o.offerTokenAndroid, 'intro');
  assert.equal(hasFreeTrial(o), true);
  assert.equal(recurringPrice(o, 'x'), 'RM39.90');
  assert.equal(introPrice(o), 'RM29.90');
  assert.equal(pickOffer(product, 'bulanan').offerTokenAndroid, 'm');
  assert.equal(pickOffer(undefined, 'tahunan'), null);
  assert.equal(recurringPrice(null, 'RM19.90'), 'RM19.90');
});

test('Excel: fail xlsx sah dengan dua helaian dan data resit', () => {
  const R = [
    { id: 'a', category: 'lifestyle', date: '2026-02-01', amount: 2000, note: 'Telefon & <case>', uri: 'x' },
    { id: 'b', category: 'medicalSelf', date: '2026-03-15', amount: 350.5, note: '' },
    { id: 'c', category: 'lifestyle', date: '2025-12-31', amount: 99, note: 'tahun lepas' },
  ];
  const bytes = buildReceiptsXlsx(R, { year: 2026, profileName: 'Ahmad' });
  const files = unzipSync(bytes);
  for (const f of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/styles.xml']) assert.ok(files[f], f);
  const s1 = strFromU8(files['xl/worksheets/sheet1.xml']);
  const s2 = strFromU8(files['xl/worksheets/sheet2.xml']);
  assert.ok(s1.includes('Gaya hidup') && s1.includes('<v>2350.5</v>') && s1.includes('Ahmad'));
  assert.ok(s2.includes('Telefon &amp; &lt;case&gt;'));
  assert.ok(!s2.includes('tahun lepas'));
  assert.ok(s2.includes(`<v>${46054}</v>`)); // 1 Feb 2026 sebagai nombor siri Excel
  assert.equal(toBase64(Uint8Array.from([80, 75, 3])), 'UEsD');
  assert.equal(toBase64(Uint8Array.from([1])), 'AQ==');
});
