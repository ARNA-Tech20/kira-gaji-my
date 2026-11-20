// Jana HTML A4 untuk PDF resit. Fungsi tulen: terima resit yang sudah ada `src` (data URI).
import { RECEIPT_CATEGORIES, folderSummary, groupOf, sortReceipts, toDisplayDate, yearOf } from '../calc/receipts.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const rm = (n) =>
  'RM ' + (Number(n) || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PER_PAGE = 4;

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: -apple-system, Roboto, "Segoe UI", Helvetica, Arial, sans-serif; color: #13201A; font-size: 10.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; height: 297mm; padding: 14mm 14mm 12mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
.band { background: #0B3D2E; color: #ECF8F2; border-radius: 6mm; padding: 9mm 9mm 8mm; }
.band small { color: #9FD4BE; font-size: 10pt; font-weight: 600; letter-spacing: .02em; }
.band h1 { margin: 2mm 0 0; font-size: 24pt; letter-spacing: -.02em; line-height: 1.1; }
.band .meta { display: flex; gap: 10mm; margin-top: 7mm; }
.band .meta div b { display: block; font-size: 16pt; font-variant-numeric: tabular-nums; }
.band .meta div span { color: #9FD4BE; font-size: 9pt; }
h2 { font-size: 13pt; margin: 9mm 0 3mm; }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: #55665D; font-weight: 700; padding: 2mm 2mm; border-bottom: 1.5px solid #13201A; }
td { padding: 2.3mm 2mm; border-bottom: 1px solid #DCE4DF; vertical-align: top; }
td.n, th.n { text-align: right; white-space: nowrap; }
tr.grp td { background: #F2F5F3; font-weight: 700; color: #0F6E56; font-size: 9pt; border-bottom: none; padding-top: 2mm; padding-bottom: 1.5mm; }
tr.tot td { font-weight: 800; border-top: 1.5px solid #13201A; border-bottom: none; }
.over { color: #8A4B00; font-size: 8.5pt; }
.note { color: #55665D; font-size: 8.5pt; line-height: 1.45; margin-top: 6mm; }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px solid #13201A; padding-bottom: 2.5mm; margin-bottom: 5mm; }
.head .t { font-size: 14pt; font-weight: 800; }
.head .g { font-size: 8.5pt; color: #0F6E56; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.head .s { text-align: right; font-size: 9pt; color: #55665D; font-variant-numeric: tabular-nums; }
.head .s b { color: #13201A; font-size: 11pt; }
.grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 5mm; height: 240mm; }
.cell { border: 1px solid #DCE4DF; border-radius: 3mm; padding: 3mm; display: flex; flex-direction: column; min-height: 0; }
.img { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; background: #F7F9F8; border-radius: 2mm; overflow: hidden; }
.img img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
.img .none { color: #97A79E; font-size: 9pt; }
.cap { display: flex; justify-content: space-between; gap: 3mm; margin-top: 2.5mm; font-variant-numeric: tabular-nums; }
.cap b { font-size: 11pt; }
.cap span { color: #55665D; font-size: 9pt; }
.cap .no { color: #97A79E; font-size: 8.5pt; }
.memo { font-size: 8.5pt; color: #55665D; margin-top: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.foot { position: absolute; left: 14mm; right: 14mm; bottom: 7mm; display: flex; justify-content: space-between; font-size: 7.5pt; color: #97A79E; }
`;

/**
 * @param receipts  senarai resit {id, category, date, amount, note, src}
 * @param opts      { year, categories?: string[] (hadkan kepada kategori ini), generatedAt?: Date }
 */
export function buildReceiptsHtml(receipts, { year, categories, ownerName, generatedAt = new Date() } = {}) {
  const inYear = receipts.filter((r) => yearOf(r) === year && (!categories || categories.includes(r.category)));
  const sum = folderSummary(inYear, year);
  const stamp = `${String(generatedAt.getDate()).padStart(2, '0')}/${String(generatedAt.getMonth() + 1).padStart(2, '0')}/${generatedAt.getFullYear()}`;
  const single = categories && categories.length === 1 ? RECEIPT_CATEGORIES.find((c) => c.key === categories[0]) : null;
  const title = single ? single.label : `Resit cukai ${year}`;

  // Bina senarai halaman dahulu supaya nombor halaman tepat
  const sections = [];
  for (const c of RECEIPT_CATEGORIES) {
    const list = sortReceipts(inYear.filter((r) => r.category === c.key)).reverse(); // tarikh menaik
    if (!list.length) continue;
    const row = sum.rows.find((x) => x.key === c.key);
    chunk(list, PER_PAGE).forEach((items, i, all) => sections.push({ c, row, items, part: i + 1, parts: all.length, offset: i * PER_PAGE }));
  }
  const totalPages = 1 + sections.length;
  const foot = (n) => `<div class="foot"><span>Kira Gaji MY · dijana ${stamp} · simpan bersama dokumen e-Filing</span><span>${n} / ${totalPages}</span></div>`;

  // Halaman ringkasan
  let rowsHtml = '';
  for (const g of [...new Set(sum.used.map((r) => r.group))]) {
    rowsHtml += `<tr class="grp"><td colspan="5">${esc(groupOf(g)?.label || g)}</td></tr>`;
    for (const r of sum.used.filter((x) => x.group === g)) {
      rowsHtml += `<tr><td>${esc(r.label)}${r.over ? `<div class="over">Melebihi had, dituntut ${rm(r.claim)} sahaja</div>` : ''}</td>
        <td class="n">${r.count}</td><td class="n">${rm(r.total)}</td><td class="n">${r.max == null ? 'Rebat' : rm(r.max)}</td><td class="n">${rm(r.claim)}</td></tr>`;
    }
  }
  if (!sum.used.length) rowsHtml = `<tr><td colspan="5" style="color:#97A79E">Tiada resit untuk tahun ${year}.</td></tr>`;

  const cover = `<section class="page">
    <div class="band">
      <small>KIRA GAJI MY · TAHUN TAKSIRAN ${year}${ownerName ? ` · ${esc(ownerName).toUpperCase()}` : ''}</small>
      <h1>${esc(title)}</h1>
      <div class="meta">
        <div><b>${sum.count}</b><span>resit</span></div>
        <div><b>${rm(sum.total)}</b><span>jumlah dibelanjakan</span></div>
        <div><b>${rm(sum.claim)}</b><span>boleh dituntut (selepas had)</span></div>
      </div>
    </div>
    <h2>Ringkasan ikut kategori</h2>
    <table>
      <thead><tr><th>Kategori</th><th class="n">Resit</th><th class="n">Jumlah</th><th class="n">Had</th><th class="n">Dituntut</th></tr></thead>
      <tbody>${rowsHtml}${sum.used.length ? `<tr class="tot"><td>Jumlah</td><td class="n">${sum.count}</td><td class="n">${rm(sum.total)}</td><td></td><td class="n">${rm(sum.claim)}</td></tr>` : ''}</tbody>
    </table>
    <p class="note">LHDN boleh meminta resit asal sehingga 7 tahun selepas tahun taksiran. Simpan PDF ini dan resit asal bersama-sama.
    Zakat ialah rebat cukai (ditolak terus daripada cukai), bukan pelepasan. Had dan syarat setiap pelepasan tertakluk kepada garis panduan LHDN terkini.
    Dokumen ini dijana oleh app dan bukan dokumen rasmi LHDN.</p>
    ${foot(1)}
  </section>`;

  const pages = sections
    .map((s, i) => {
      const cells = s.items
        .map((r, j) => {
          const img = r.src ? `<img src="${r.src}" alt="">` : `<span class="none">Tiada gambar</span>`;
          return `<div class="cell"><div class="img">${img}</div>
            <div class="cap"><span>${esc(toDisplayDate(r.date))}</span><b>${rm(r.amount)}</b></div>
            <div class="cap"><span class="memo">${esc(r.note || '-')}</span><span class="no">#${s.offset + j + 1}</span></div></div>`;
        })
        .join('');
      return `<section class="page">
        <div class="head"><div><div class="g">${esc(groupOf(s.c.group)?.label || '')}</div><div class="t">${esc(s.c.label)}${s.parts > 1 ? ` <span style="font-weight:600;color:#55665D;font-size:10pt">(${s.part}/${s.parts})</span>` : ''}</div></div>
          <div class="s">${s.row.count} resit · <b>${rm(s.row.total)}</b>${s.row.max != null ? `<br>dituntut ${rm(s.row.claim)} / had ${rm(s.row.max)}` : ''}</div></div>
        <div class="grid">${cells}</div>
        ${foot(i + 2)}
      </section>`;
    })
    .join('');

  return { html: `<!doctype html><html lang="ms"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${cover}${pages}</body></html>`, pages: totalPages, summary: sum };
}
