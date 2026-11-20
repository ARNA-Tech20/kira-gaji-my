// Profil berbilang (Pro): setiap profil ada kiraan dan resit sendiri.
// Profil pertama guna kunci lama supaya data pengguna sedia ada tidak perlu dipindah.
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIST_KEY = 'kiragaji.profiles.v1';
export const DEFAULT_PROFILES = { active: 'p1', list: [{ id: 'p1', name: 'Saya' }] };

let active = 'p1';
export const activeProfileId = () => active;
export const setActiveProfileId = (id) => {
  active = id || 'p1';
};

export const profileKey = (base, id = active) => (id === 'p1' ? base : `${base}.${id}`);
export const receiptDir = (id = active) => (id === 'p1' ? 'resit/' : `resit-${id}/`);

export async function loadProfiles() {
  try {
    const raw = await AsyncStorage.getItem(LIST_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (!v || !Array.isArray(v.list) || !v.list.length) return DEFAULT_PROFILES;
    return v;
  } catch {
    return DEFAULT_PROFILES;
  }
}

export async function saveProfiles(v) {
  try {
    await AsyncStorage.setItem(LIST_KEY, JSON.stringify(v));
  } catch {
    // abaikan
  }
  return v;
}

// Profil yang boleh digunakan pada tier semasa (selebihnya disimpan tetapi disembunyikan)
export function usableProfiles(state, maxProfiles) {
  const list = state.list.slice(0, Math.max(1, maxProfiles));
  const activeOk = list.some((p) => p.id === state.active);
  return { list, active: activeOk ? state.active : list[0].id };
}

export function addSecondProfile(state, name = 'Pasangan') {
  if (state.list.some((p) => p.id === 'p2')) return state;
  return { ...state, list: [...state.list, { id: 'p2', name }] };
}

export function renameProfile(state, id, name) {
  const n = String(name || '').trim().slice(0, 24);
  if (!n) return state;
  return { ...state, list: state.list.map((p) => (p.id === id ? { ...p, name: n } : p)) };
}
