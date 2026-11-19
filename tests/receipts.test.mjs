import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, validateReceipt, totalsByCategory, folderSummary, mergeReceiptInputs, receiptYears, RECEIPT_CATEGORIES } from '../src/calc/receipts.js';
import { buildReceiptsHtml } from '../src/pdf/receiptsHtml.js';
import { annualTax } from '../src/calc/tax.js';

const R = [
  { id: 'a', category: 'lifestyle', date: '2026-02-01', amount: 2000 },
  { id: 'b', category: 'lifestyle', date: '2026-03-01', amount: 900 },
  { id: 'c', category: 'medicalSelf', date: '2026-04-01', amount: 350.5 },
  { id: 'd', category: 'zakat', date: '2026-05-01', amount: 800 },
  { id: 'e', category: 'life', date: '2026-06-01', amount: 3600 },
  { id: 'f', category: 'lifestyle', date: '2025-12-31', amount: 100 },
];

test('tarikh HH/BB/TTTT ditukar dan tarikh mustahil ditolak', () => {
  assert.equal(parseDate('5/1/2026'), '2026-01-05');
  assert.equal(parseDate('2026-11-19'), '2026-11-19');
  assert.equal(parseDate('31/02/2026'), null);
  assert.equal(parseDate('abc'), null);
});

test('validasi resit', () => {
  assert.deepEqual(validateReceipt({ category: 'lifestyle', date: '01/01/2026', amount: '12.50' }), {});
  const e = validateReceipt({ category: 'tiada', date: '', amount: '0' });
  assert.deepEqual(Object.keys(e).sort(), ['amount', 'category', 'date']);
});

test('jumlah ikut kategori hanya bagi tahun dipilih', () => {
  const t = totalsByCategory(R, 2026);
  assert.deepEqual(t.lifestyle, { count: 2, total: 2900 });
  assert.equal(t.medicalSelf.total, 350.5);
  assert.deepEqual(receiptYears(R, 2026), [2026, 2025]);
});

test('had pelepasan dikenakan dalam ringkasan folder', () => {
  const s = folderSummary(R, 2026);
  const life = s.rows.find((r) => r.key === 'lifestyle');
  assert.equal(life.claim, 2500);
  assert.equal(life.over, true);
  assert.equal(s.rows.find((r) => r.key === 'life').claim, 3000);
  assert.equal(s.rows.find((r) => r.key === 'zakat').claim, 800);
  assert.equal(s.count, 5);
});

test('resit mengatasi nilai manual dan masuk kiraan cukai', () => {
  const profile = { reliefs: { lifestyle: '100', sports: '500' }, life: '1000', zakatPaid: '0' };
  const m = mergeReceiptInputs(profile, R, 2026);
  assert.equal(m.reliefs.lifestyle, '2900');
  assert.equal(m.reliefs.sports, '500'); // tiada resit, nilai manual kekal
  assert.equal(m.life, '3600');
  assert.equal(m.zakatPaid, '800');
  assert.deepEqual(Object.keys(m.locked).sort(), ['life', 'lifestyle', 'medicalSelf', 'zakat']);
  const tax = annualTax({ monthlyGross: 8000, lifeInsurance: +m.life, zakatPaid: +m.zakatPaid, reliefInputs: m.reliefs });
  const base = annualTax({ monthlyGross: 8000 });
  assert.ok(tax.taxPayable < base.taxPayable);
  assert.equal(tax.reliefs.lifeInsurance, 3000);
});

test('setiap kategori resit wujud dan unik', () => {
  const keys = RECEIPT_CATEGORIES.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes('life') && keys.includes('zakat'));
});

test('HTML PDF: halaman ringkasan + 4 resit setiap halaman ikut kategori', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, category: 'medicalSelf', date: `2026-01-${String(i + 1).padStart(2, '0')}`, amount: 10, note: '<b>' }));
  const { html, pages } = buildReceiptsHtml([...many, R[0]], { year: 2026 });
  assert.equal(pages, 1 + 3 + 1); // ringkasan, perubatan 9 → 3 halaman, gaya hidup 1
  assert.equal((html.match(/class="page"/g) || []).length, pages);
  assert.ok(!html.includes('<b></b>') && html.includes('&lt;b&gt;'));
  const one = buildReceiptsHtml(R, { year: 2026, categories: ['lifestyle'] });
  assert.equal(one.pages, 2);
  assert.ok(one.html.includes('Gaya hidup'));
});
