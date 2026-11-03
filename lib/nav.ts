import type { Router } from 'expo-router';

// Orqaga qaytish; tarix bo'lmasa (ekran to'g'ridan-to'g'ri ochilgan) bosh sahifaga o'tadi.
export function goBack(router: Pick<Router, 'canGoBack' | 'back' | 'replace'>): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
