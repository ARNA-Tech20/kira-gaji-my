import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// Tangkap kad keputusan sebagai PNG dan buka helaian kongsi (WhatsApp, Telegram...)
export async function shareCard(ref) {
  if (!ref?.current) return { ok: false, reason: 'no-ref' };
  try {
    const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
    if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'unavailable' };
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Kongsi keputusan' });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}
