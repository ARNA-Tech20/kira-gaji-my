// Jana PDF A4 dalam telefon dan buka helaian kongsi (WhatsApp, Drive, e-mel, simpan ke Fail)
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { buildReceiptsHtml } from './receiptsHtml';
import { readAsDataUri } from '../receiptStore';
import { yearOf } from '../calc/receipts';

export async function exportReceiptsPdf(receipts, { year, categories, fileLabel }) {
  const chosen = receipts.filter((r) => yearOf(r) === year && (!categories || categories.includes(r.category)));
  if (!chosen.length) return { ok: false, reason: 'empty' };

  // Baca gambar satu demi satu untuk jimat memori
  const withSrc = [];
  for (const r of chosen) withSrc.push({ ...r, src: await readAsDataUri(r.uri) });

  const { html } = buildReceiptsHtml(withSrc, { year, categories });
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842, margins: { top: 0, bottom: 0, left: 0, right: 0 } });

  // Namakan semula supaya mudah dicari
  const safe = String(fileLabel || 'semua').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const target = `${FileSystem.cacheDirectory}Resit-${year}-${safe}.pdf`;
  let out = uri;
  try {
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: target });
    out = target;
  } catch {
    // guna nama asal jika gagal
  }

  if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'share', uri: out };
  await Sharing.shareAsync(out, { mimeType: 'application/pdf', dialogTitle: 'Simpan atau kongsi PDF resit', UTI: 'com.adobe.pdf' });
  return { ok: true, uri: out };
}
