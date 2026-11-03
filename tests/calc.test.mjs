import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perkesoBand, netSalary } from '../src/calc/payroll.js';
import { progressiveTax, annualTax } from '../src/calc/tax.js';
import { zakatPendapatan } from '../src/calc/zakat.js';

test('PERKESO pada siling RM6,000 sepadan jadual rasmi', () => {
  assert.equal(perkesoBand(6000, 0.002), 11.9); // SIP maksimum
  assert.equal(perkesoBand(6000, 0.005), 29.75); // PERKESO pekerja maksimum
  assert.equal(perkesoBand(6000, 0.0075), 44.65); // LINDUNG 24 Jam maksimum
  assert.equal(perkesoBand(9000, 0.002), 11.9); // melebihi siling kekal sama
});

test('PERKESO gaji RM3,000', () => {
  assert.equal(perkesoBand(3000, 0.005), 14.75);
  assert.equal(perkesoBand(3000, 0.002), 5.9);
});

test('Cukai progresif ikut jadual kumulatif LHDN', () => {
  assert.equal(progressiveTax(5000), 0);
  assert.equal(progressiveTax(20000), 150);
  assert.equal(progressiveTax(35000), 600);
  assert.equal(progressiveTax(50000), 1500);
  assert.equal(progressiveTax(70000), 3700);
  assert.equal(progressiveTax(100000), 9400);
});

test('Gaji bersih RM3,000 tanpa LINDUNG 24 Jam', () => {
  const r = netSalary({ gross: 3000, includeSkbbk: false });
  assert.equal(r.epf, 330);
  assert.equal(r.net, 3000 - 330 - 14.75 - 5.9);
});

test('Rebat RM400 hanya jika pendapatan bercukai <= RM35,000', () => {
  const low = annualTax({ monthlyGross: 3500 });
  assert.ok(low.chargeable <= 35000);
  assert.ok(low.rebate > 0);
  const high = annualTax({ monthlyGross: 8000 });
  assert.equal(high.rebate, 0);
});

test('Rebat zakat tidak melebihi cukai', () => {
  const r = annualTax({ monthlyGross: 8000, zakatPaid: 999999 });
  assert.equal(r.taxPayable, 0);
});

test('Zakat bawah nisab = tidak wajib', () => {
  const r = zakatPendapatan({ annualIncome: 20000, nisab: 25000 });
  assert.equal(r.eligible, false);
  assert.equal(r.annual, 0);
  const r2 = zakatPendapatan({ annualIncome: 60000, nisab: 25000 });
  assert.equal(r2.annual, 1500);
});

test('Insurans hayat dihadkan RM3,000', () => {
  const r = annualTax({ monthlyGross: 2000, lifeInsurance: 6000 });
  assert.equal(r.reliefs.lifeInsurance, 3000);
});

test('PCB anggaran bawah RM10 sebulan jadi RM0', () => {
  const r = annualTax({ monthlyGross: 3500 });
  assert.ok(r.taxPayable > 0);
  assert.equal(r.monthlyEstimate, 0);
});

test('Pekerja 60+: KWSP pekerja 0%, majikan 4%, tiada PERKESO/SIP pekerja', () => {
  const r = netSalary({ gross: 4000, age60: true, includeSkbbk: false });
  assert.equal(r.epf, 0);
  assert.equal(r.socso, 0);
  assert.equal(r.eis, 0);
  assert.equal(r.employer.epf, 160);
  assert.equal(r.net, 4000);
});

test('Baki cukai: bayaran balik bila PCB lebih', () => {
  const r = annualTax({ monthlyGross: 8000, pcbPaid: 7000 });
  assert.equal(r.balance, Math.round((r.taxPayable - 7000) * 100) / 100);
  assert.ok(r.balance < 0);
});

test('Katalog pelepasan: had, bilangan dan ya/tidak', async () => {
  const { catalogClaims } = await import('../src/calc/reliefs.js');
  const c = catalogClaims({ lifestyle: 9999, childHigher: 2, okuSelf: true, sports: 300 });
  const get = (k) => c.items.find((x) => x.key === k).claim;
  assert.equal(get('lifestyle'), 2500);
  assert.equal(get('childHigher'), 16000);
  assert.equal(get('okuSelf'), 7000);
  assert.equal(get('sports'), 300);
  assert.equal(c.total, 25800);
});

test('Pelepasan katalog mengurangkan pendapatan bercukai', () => {
  const a = annualTax({ monthlyGross: 8000 });
  const b = annualTax({ monthlyGross: 8000, reliefInputs: { medicalParents: 8000 } });
  assert.equal(a.chargeable - b.chargeable, 8000);
  assert.ok(b.taxPayable < a.taxPayable);
});

test('Had kifayah Selangor + perbandingan kaedah', async () => {
  const { hadKifayah, zakatCompare } = await import('../src/calc/zakat.js');
  const hk = hadKifayah({ adult: 1, child7: 2 }, 6600);
  assert.equal(hk.total, 14580 + 4944 + 2 * 4896 + 6600);
  const c = zakatCompare({ annualIncome: 120000, nisab: 38748, counts: { adult: 1 }, epfAnnual: 13200 });
  assert.equal(c.kasar.annual, 3000);
  assert.equal(c.bersih.annual, Math.round((120000 - 14580 - 4944 - 13200) * 0.025 * 100) / 100);
  assert.ok(c.diff > 0);
});
