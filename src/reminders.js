// Peringatan bulanan untuk simpan resit (Plus dan Pro). Notifikasi setempat sahaja, tiada pelayan.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let N = null;
try {
  N = Platform.OS === 'web' ? null : require('expo-notifications');
} catch {
  N = null;
}

const KEY = 'kiragaji.reminder.v1';

export async function reminderEnabled() {
  try {
    return !!JSON.parse((await AsyncStorage.getItem(KEY)) || 'null')?.id;
  } catch {
    return false;
  }
}

// Pulangkan true jika berjaya dihidupkan
export async function enableReminder() {
  if (!N) return false;
  const perm = await N.requestPermissionsAsync();
  if (!perm.granted) return false;
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('resit', { name: 'Peringatan resit', importance: N.AndroidImportance.DEFAULT });
  }
  await disableReminder();
  const id = await N.scheduleNotificationAsync({
    content: { title: 'Ada resit bulan ini?', body: 'Snap sekarang, nanti musim e-Filing semuanya sudah tersusun.' },
    trigger: { type: N.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour: 20, minute: 30, channelId: 'resit' },
  });
  await AsyncStorage.setItem(KEY, JSON.stringify({ id }));
  return true;
}

export async function disableReminder() {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
    if (v?.id && N) await N.cancelScheduledNotificationAsync(v.id);
    await AsyncStorage.removeItem(KEY);
  } catch {
    // abaikan
  }
}
