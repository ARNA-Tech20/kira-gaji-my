// Simpanan resit dalam telefon pengguna sahaja.
// Metadata → AsyncStorage. Gambar → <documentDirectory>/resit/<kategori>/<id>.jpg
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { profileKey, receiptDir } from './profiles';

const KEY = 'kiragaji.receipts.v1';
const ROOT = () => `${FileSystem.documentDirectory}${receiptDir()}`;

export async function loadReceipts() {
  try {
    const raw = await AsyncStorage.getItem(profileKey(KEY));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function persist(list) {
  await AsyncStorage.setItem(profileKey(KEY), JSON.stringify(list));
  return list;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Ambil gambar dari kamera atau galeri. Pulangkan uri sementara atau null.
export async function pickImage(source) {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'permission' };
  const opts = { mediaTypes: ['images'], quality: 0.9, allowsEditing: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return { ok: false, reason: 'cancel' };
  return { ok: true, uri: res.assets[0].uri };
}

// Kecilkan ke lebar 1200px JPEG supaya ringan tetapi masih boleh dibaca
async function shrink(uri) {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1200 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
  return out.uri;
}

export async function addReceipt(list, { category, date, amount, note, imageUri }) {
  const id = newId();
  let uri = null;
  if (imageUri) {
    const dir = `${ROOT()}${category}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    let src = imageUri;
    try {
      src = await shrink(imageUri);
    } catch {
      // jika gagal kecilkan, simpan gambar asal
    }
    uri = `${dir}${id}.jpg`;
    await FileSystem.copyAsync({ from: src, to: uri });
  }
  const r = {
    id,
    category,
    date,
    amount: Math.round(Number(String(amount).replace(/,/g, '')) * 100) / 100,
    note: String(note || '').trim(),
    uri,
    createdAt: Date.now(),
  };
  return persist([r, ...list]);
}

export async function updateReceipt(list, id, patch) {
  return persist(list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export async function deleteReceipt(list, id) {
  const r = list.find((x) => x.id === id);
  if (r?.uri) {
    try {
      await FileSystem.deleteAsync(r.uri, { idempotent: true });
    } catch {
      // fail mungkin sudah tiada
    }
  }
  return persist(list.filter((x) => x.id !== id));
}

// Baca gambar sebagai data URI untuk dibenamkan dalam PDF
export async function readAsDataUri(uri) {
  if (!uri) return null;
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}
