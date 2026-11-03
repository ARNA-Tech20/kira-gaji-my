import { RATES } from './rates.js';
import { epfEmployee, perkesoBand } from './payroll.js';
import { catalogClaims } from './reliefs.js';

const round2 = (n) => Math.round(n * 100) / 100;

// Cukai progresif atas pendapatan bercukai (sebelum rebat).
export function progressiveTax(chargeable, bands = RATES.taxBands) {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of bands) {
    if (chargeable <= lower) break;
    const slice = Math.min(chargeable, upper) - lower;
    tax += slice * rate;
    lower = upper;
  }
  return round2(tax);
}

/**
 * Anggaran cukai tahunan pemastautin bergaji.
 * @param {object} p
 * @param {number} p.monthlyGross
 * @param {number} [p.bonus=0] bonus/pendapatan tambahan setahun
 * @param {boolean} [p.spouseNoIncome=false]
 * @param {number} [p.childrenUnder18=0]
 * @param {number} [p.lifeInsurance=0] premium insurans hayat/takaful setahun
 * @param {number} [p.otherReliefs=0] pelepasan lain (gaya hidup, perubatan, dll.)
 * @param {object} [p.reliefInputs={}] input katalog pelepasan (lihat reliefs.js)
 * @param {boolean} [p.age60=false]
 * @param {number} [p.pcbPaid=0] PCB yang sudah dipotong tahun ini
 * @param {number} [p.zakatPaid=0] zakat dibayar setahun (rebat ringgit-untuk-ringgit)
 */
export function annualTax({
  monthlyGross,
  bonus = 0,
  spouseNoIncome = false,
  childrenUnder18 = 0,
  lifeInsurance = 0,
  otherReliefs = 0,
  zakatPaid = 0,
  age60 = false,
  pcbPaid = 0,
  reliefInputs = {},
}) {
  const g = Number(monthlyGross) || 0;
  const R = RATES.reliefs;
  const annualGross = g * 12 + (Number(bonus) || 0);

  const epfRate = age60 ? RATES.epf.employee60 : RATES.epf.employee;
  const epfPaid = epfEmployee(g, epfRate) * 12 + epfEmployee(bonus, epfRate);
  const epfRelief = Math.min(epfPaid, R.epfMax);
  const lifeRelief = Math.min(Number(lifeInsurance) || 0, R.lifeInsuranceMax, R.epfLifeCombinedMax - epfRelief);

  const socsoEisPaid = age60
    ? 0
    : (perkesoBand(g, RATES.perkeso.socsoEmployee) + perkesoBand(g, RATES.perkeso.eisEmployee)) * 12;
  const socsoEisRelief = Math.min(socsoEisPaid, R.socsoEisMax);

  const reliefs = {
    individual: R.individual,
    spouse: spouseNoIncome ? R.spouseNoIncome : 0,
    children: Math.max(0, Math.floor(childrenUnder18)) * R.childUnder18,
    epf: epfRelief,
    lifeInsurance: lifeRelief,
    socsoEis: round2(socsoEisRelief),
    other: Number(otherReliefs) || 0,
  };
  const catalog = catalogClaims(reliefInputs);
  reliefs.catalog = catalog.total;
  const totalReliefs = round2(Object.values(reliefs).reduce((a, b) => a + b, 0));

  const chargeable = Math.max(0, round2(annualGross - totalReliefs));
  const taxBeforeRebate = progressiveTax(chargeable);

  let rebate = 0;
  if (chargeable <= RATES.rebate.chargeableLimit) {
    rebate = RATES.rebate.amount + (spouseNoIncome ? RATES.rebate.amount : 0);
  }
  const afterPersonalRebate = Math.max(0, taxBeforeRebate - rebate);
  const zakatRebate = Math.min(Number(zakatPaid) || 0, afterPersonalRebate);
  const taxPayable = round2(afterPersonalRebate - zakatRebate);

  return {
    annualGross: round2(annualGross),
    reliefs,
    catalog,
    totalReliefs,
    chargeable,
    taxBeforeRebate,
    rebate: round2(Math.min(rebate, taxBeforeRebate)),
    zakatRebate: round2(zakatRebate),
    taxPayable,
    pcbPaid: round2(Number(pcbPaid) || 0),
    // positif = perlu bayar lagi, negatif = bayaran balik
    balance: round2(taxPayable - (Number(pcbPaid) || 0)),
    monthlyEstimate: taxPayable / 12 < RATES.pcbMinimum ? 0 : round2(taxPayable / 12),
    effectiveRate: annualGross > 0 ? round2((taxPayable / annualGross) * 100) : 0,
  };
}
