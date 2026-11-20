// Penulis .xlsx kecil (Office Open XML) tanpa pustaka berat: dua helaian, Ringkasan dan Resit.
// Fungsi tulen, pulangkan Uint8Array. Dibuka dengan Excel, Google Sheets dan Numbers.
import { zipSync, strToU8 } from 'fflate';
import { RECEIPT_CATEGORIES, categoryOf, folderSummary, groupOf, sortReceipts, yearOf } from '../calc/receipts.js';

const esc = (s) =>
  String(s ?? '')
    // buang aksara kawalan yang tidak sah dalam XML
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const col = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// Nombor siri tarikh Excel (1900 system)
const excelDate = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
};

// Gaya: 0 biasa, 1 tajuk tebal, 2 wang, 3 tarikh, 4 wang tebal
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE1F5EE"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// cell: string | number | { v, s } (s = indeks gaya)
function sheetXml(rows, widths) {
  const body = rows
    .map((cells, r) => {
      const cs = cells
        .map((c, i) => {
          if (c == null || c === '') return '';
          const cell = typeof c === 'object' ? c : { v: c };
          const ref = `${col(i)}${r + 1}`;
          const s = cell.s ? ` s="${cell.s}"` : '';
          if (typeof cell.v === 'number') return `<c r="${ref}"${s}><v>${cell.v}</v></c>`;
          return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(cell.v)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${cs}</row>`;
    })
    .join('');
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
}

export function buildReceiptsXlsx(receipts, { year, profileName } = {}) {
  const inYear = receipts.filter((r) => yearOf(r) === year);
  const sum = folderSummary(inYear, year);
  const H = (v) => ({ v, s: 1 });
  const M = (v) => ({ v: Math.round(v * 100) / 100, s: 2 });

  const summary = [
    [H('Kategori'), H('Kumpulan'), H('Bil. resit'), H('Jumlah (RM)'), H('Had (RM)'), H('Dituntut (RM)')],
    ...sum.used.map((r) => [r.label, groupOf(r.group)?.label || '', r.count, M(r.total), r.max == null ? 'Rebat' : M(r.max), M(r.claim)]),
    [],
    [{ v: 'Jumlah', s: 1 }, '', sum.count, { v: sum.total, s: 4 }, '', { v: sum.claim, s: 4 }],
    [],
    [`Tahun taksiran ${year}${profileName ? ` · ${profileName}` : ''}`],
    ['Dijana oleh KIRA GAJI MY. Anggaran sahaja, rujuk garis panduan LHDN terkini.'],
  ];

  const order = Object.fromEntries(RECEIPT_CATEGORIES.map((c, i) => [c.key, i]));
  const list = sortReceipts(inYear)
    .reverse()
    .sort((a, b) => order[a.category] - order[b.category]);
  const detail = [
    [H('Tarikh'), H('Kategori'), H('Jumlah (RM)'), H('Catatan'), H('Ada gambar')],
    ...list.map((r) => [{ v: excelDate(r.date), s: 3 }, categoryOf(r.category)?.label || r.category, M(Number(r.amount) || 0), r.note || '', r.uri ? 'Ya' : 'Tidak']),
  ];

  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Ringkasan" sheetId="1" r:id="rId1"/><sheet name="Resit" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': STYLES,
    'xl/worksheets/sheet1.xml': sheetXml(summary, [34, 22, 11, 14, 12, 14]),
    'xl/worksheets/sheet2.xml': sheetXml(detail, [12, 34, 14, 36, 11]),
  };
  const zipped = {};
  for (const [k, v] of Object.entries(files)) zipped[k] = strToU8(v);
  return zipSync(zipped, { level: 6 });
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function toBase64(bytes) {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}
