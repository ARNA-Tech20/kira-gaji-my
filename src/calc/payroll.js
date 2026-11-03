import { RATES } from './rates.js';

const round2 = (n) => Math.round(n * 100) / 100;

// Jadual PERKESO berjalur RM100. Caruman dikira pada titik tengah jalur
// dan dibundar naik ke 5 sen terdekat. Ini sepadan dengan jadual rasmi
// untuk kebanyakan jalur; jalur gaji sangat rendah mungkin berbeza sedikit.
export function perkesoBand(wage, rate, ceiling = RATES.perkeso.ceiling) {
  if (!wage || wage <= 0) return 0;
  const w = Math.min(wage, ceiling);
  const upper = Math.ceil(w / 100) * 100;
  const base = upper - 50;
  return Math.ceil(rate * base * 20 - 1e-9) / 20;
}

// KWSP: jadual rasmi berjalur; anggaran ini membundar naik ke ringgit penuh.
export function epfEmployee(wage, rate = RATES.epf.employee) {
  if (!wage || wage <= 0 || rate <= 0) return 0;
  return Math.ceil(wage * rate - 1e-9);
}

export function epfEmployer(wage, age60 = false) {
  if (!wage || wage <= 0) return 0;
  const { employerLow, employerHigh, employerThreshold, employer60 } = RATES.epf;
  const rate = age60 ? employer60 : wage <= employerThreshold ? employerLow : employerHigh;
  return Math.ceil(wage * rate - 1e-9);
}

/**
 * Potongan berkanun bulanan pekerja.
 * @param {object} p
 * @param {number} p.gross gaji kasar bulanan (RM)
 * @param {boolean} [p.age60=false] pekerja berumur 60 tahun ke atas
 * @param {boolean} [p.includeSkbbk=true] LINDUNG 24 Jam (warganegara boleh opt-out)
 * @param {number} [p.pcb=0] PCB bulanan (dari kalkulator cukai atau slip gaji)
 * @param {number} [p.zakatMonthly=0] zakat dipotong melalui gaji
 * @param {number} [p.otherDeductions=0]
 */
export function netSalary({ gross, age60 = false, includeSkbbk = true, pcb = 0, zakatMonthly = 0, otherDeductions = 0 }) {
  const g = Number(gross) || 0;
  const { socsoEmployee, eisEmployee, skbbkEmployee } = RATES.perkeso;

  const epf = age60 ? epfEmployee(g, RATES.epf.employee60) : epfEmployee(g);
  const socso = age60 ? 0 : perkesoBand(g, socsoEmployee);
  const eis = age60 ? 0 : perkesoBand(g, eisEmployee);
  const skbbk = includeSkbbk ? perkesoBand(g, skbbkEmployee) : 0;

  const totalDeductions = round2(epf + socso + eis + skbbk + pcb + zakatMonthly + otherDeductions);

  return {
    gross: g,
    epf,
    socso,
    eis,
    skbbk,
    pcb: round2(pcb),
    zakat: round2(zakatMonthly),
    other: round2(otherDeductions),
    totalDeductions,
    net: round2(g - totalDeductions),
    employer: {
      epf: epfEmployer(g, age60),
      socso: age60 ? perkesoBand(g, RATES.perkeso.employer60Socso) : null,
    },
  };
}
