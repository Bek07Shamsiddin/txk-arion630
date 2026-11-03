import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Vibration } from 'react-native';
import { db } from '@/lib/db';
import type { AppNotification } from '@/lib/db/schema';
import { onLiveTick } from '@/lib/live/fieldWork';
import { getAlertPrefs } from '@/lib/live/alertPrefs';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

let player: ReturnType<typeof createAudioPlayer> | null = null;
function siren() {
  try {
    if (!player) {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
      player = createAudioPlayer(require('../assets/sounds/siren.wav'));
    }
    player.seekTo(0);
    player.play();
  } catch {
    // ovoz chiqmasa ham rang ishlaydi
  }
}

// Algoritm bo'yicha ogohlantirish: ovoz + ekran chetida rangli "sirena" yonishi.
const LEVEL: Partial<Record<AppNotification['kind'], { color: string; rank: number; freq: number }>> = {
  service_soon: { color: '#f59e0b', rank: 1, freq: 660 },
  service_reminder: { color: '#ea580c', rank: 2, freq: 740 },
  service_overdue: { color: '#dc2626', rank: 3, freq: 880 },
  escalation: { color: '#7f1d1d', rank: 4, freq: 988 },
};

async function beep(freq: number, repeats: number) {
  const prefs = await getAlertPrefs();
  if (prefs.vibration && Platform.OS !== 'web') Vibration.vibrate(Array.from({ length: repeats * 2 }, () => 250));
  if (!prefs.sound) return;
  if (Platform.OS !== 'web') return siren();
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    for (let i = 0; i < repeats; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = i % 2 ? freq * 0.75 : freq;
      g.gain.value = 0.08;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.3);
      o.stop(ctx.currentTime + i * 0.3 + 0.22);
    }
  } catch {
    // ovoz bo'lmasa ham rang ishlaydi
  }
}

export function AlertFlash() {
  const seen = useRef<Set<string> | null>(null);
  const [color, setColor] = useState('#dc2626');
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const check = async () => {
      const all = await db.notifications.list();
      if (seen.current === null) {
        seen.current = new Set(all.map((n) => n.id));
        return;
      }
      const fresh = all.filter((n) => !seen.current!.has(n.id));
      fresh.forEach((n) => seen.current!.add(n.id));
      const top = fresh
        .map((n) => LEVEL[n.kind])
        .filter((x): x is { color: string; rank: number; freq: number } => !!x)
        .sort((a, b) => b.rank - a.rank)[0];
      if (!top) return;
      setColor(top.color);
      beep(top.freq, top.rank + 1).catch(() => undefined);
      anim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]),
        { iterations: 3 + top.rank },
      ).start();
    };
    check().catch(() => undefined);
    return onLiveTick(() => {
      check().catch(() => undefined);
    });
  }, [anim]);

  return <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: color, opacity: anim }]} />;
}

const styles = StyleSheet.create({
  ring: { ...StyleSheet.absoluteFillObject, borderWidth: 10, zIndex: 9999 },
});
