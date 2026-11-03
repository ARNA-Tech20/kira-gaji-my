import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kiragaji.profile.v1';

export const DEFAULT_PROFILE = {
  gross: '3500',
  age60: false,
  pcbPaid: '0',
  reliefs: {},
  bonus: '0',
  skbbk: true,
  spouse: false,
  children: '0',
  life: '0',
  other: '0',
  zakatPaid: '0',
  nisab: '',
  zakatState: '',
  hk: {},
  zakatMethod: 'kasar',
};

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

let timer = null;
// Simpan selepas pengguna berhenti menaip (elak tulis setiap ketukan kekunci)
export function saveProfileDebounced(profile, delay = 500) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(profile)).catch(() => {});
  }, delay);
}

export async function resetProfile() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
  return DEFAULT_PROFILE;
}
