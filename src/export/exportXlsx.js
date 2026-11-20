// Simpan .xlsx dalam cache telefon dan buka helaian kongsi
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { buildReceiptsXlsx, toBase64 } from './xlsx';
import { yearOf } from '../calc/receipts';

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function exportReceiptsXlsx(receipts, { year, profileName }) {
  if (!receipts.some((r) => yearOf(r) === year)) return { ok: false, reason: 'empty' };
  const bytes = buildReceiptsXlsx(receipts, { year, profileName });
  const safe = String(profileName || 'saya').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const uri = `${FileSystem.cacheDirectory}Resit-${year}-${safe}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, toBase64(bytes), { encoding: 'base64' });
  if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'share', uri };
  await Sharing.shareAsync(uri, { mimeType: MIME, dialogTitle: 'Simpan atau kongsi Excel resit', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
  return { ok: true, uri };
}
