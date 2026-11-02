# TXK Arion-630 oflayn ilova — amalga oshirish rejasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bolt'dagi Expo + Supabase ilovasini keltirilgan moto-soat asosidagi moslashuvchan TXK usuli va simulyatorga ega oflayn Android ilovaga aylantirish.

**Architecture:** Ilmiy hisob-kitoblar `lib/core/` dagi sof funksiyalarda (saqlash va UI'dan mustaqil, to'liq unit-test). Ma'lumot `lib/db/` dagi AsyncStorage asosidagi omborda, ekranlar faqat `lib/db` va `lib/services` orqali ishlaydi. Traktor holati (TXK hisoblagichlari) har doim moto-soat va TXK yozuvlarini qayta o'ynatish (replay) orqali olinadi — tuzatish va o'chirish shu bilan to'g'ri ishlaydi.

**Tech Stack:** Expo SDK 54, expo-router 6, React Native 0.81, TypeScript 5.9, `@react-native-async-storage/async-storage`, `expo-file-system`, `expo-image-manipulator`, `expo-document-picker`, `expo-sharing`, `react-native-chart-kit` (mavjud), Jest + `jest-expo`, EAS Build.

**Spec:** `docs/superpowers/specs/2026-11-02-txk-oflayn-design.md`

## Global Constraints

- Ilova to'liq oflayn: tarmoq so'rovi, Supabase, `.env` yo'q.
- Interfeys tili — o'zbek (lotin); barcha foydalanuvchiga ko'rinadigan matn `lib/i18n/uz.ts` dan.
- Reglament: O50 (50, bir martalik), O100 (100, bir martalik), T250 (250, davriy), T500 (500, davriy, qamraydi T250), T1000 (1000, davriy, qamraydi T500, T250).
- Sozlamalar boshlang'ich qiymati: `nominalFuelLph = 18`, `gamma = 1.0`, `calendarMonths = 12`, `dueSoonFraction = 0.1`, `reorderBufferDays = 3`, `shiftHoursPerDay = 10`, `kMin = 0.2`, `kMax = 2.0`, prognoz oynasi 14 kun, `α = 0.3`, prognoz uchun kamida 3 ish kuni.
- Ish turlari jadvali (spec 4.1) `verified: false` bilan seed qilinadi, ekranda "tasdiqlanmagan" belgisi.
- Simulyator natijalari ekranida doimiy matn: "Natijalar imitatsion model natijalari; real ma'lumot bilan tasdiqlanishi kerak."
- Sanalar `YYYY-MM-DD` satr ko'rinishida (mahalliy sana); vaqt belgilari ISO.
- Har bir topshiriq oxirida `npx tsc --noEmit` va `npx jest` xatosiz.
- Commit xabarlari oxirida: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Xato kiritilgan hisoblagich** (masalan 245 o'rniga 2450): oxirgi yozuvni o'chirish mumkin bo'lishi va hisoblagichlar to'g'ri qaytishi kerak → Task 6 `deleteMotoReading` testi.
2. **Orqa sana bilan yozuv** (oxirgi yozuvdan oldingi sana): rad etilishi kerak, aks holda prognoz buziladi → Task 6 `date_before_last` testi.
3. **Katta boshlang'ich soat bilan ro'yxatga olish** (1300 m/s): obkatka eslatmalari yog'ilmasligi, davriy hisoblagichlar qoldiq bo'yicha boshlanishi kerak → Task 2 `initialCounters` testi.
4. **Eski versiyali yoki begona JSON import**: mavjud ma'lumotga tegmasdan rad etish yoki migratsiya qilish → Task 5 testlari.
5. **Telefonda og'ir simulyatsiya** (R=1000, N=100, D=365): chegaradan oshgan parametr rad etiladi, ishlash bo'laklarga bo'linib UI qotmaydi → Task 4 `validateSimParams` testi, Task 12 progress.
6. (qo'shimcha) **Vergulli son** "8,5": barcha son maydonlari `parseDecimal` orqali → Task 6 testi.

---

## Fayl tuzilmasi

```
lib/core/types.ts          OperationType, WorkShare, RegulationLevel, PartSpec, CoreSettings, LevelCounter, LevelStatus
lib/core/defaults.ts       DEFAULT_SETTINGS, DEFAULT_REGULATION, DEFAULT_OPERATION_TYPES
lib/core/loadFactor.ts     K va keltirilgan soat
lib/core/regulation.ts     hisoblagichlar, holat baholash, TXK qo'llash, replay
lib/core/forecast.ts       jadallik va sana prognozi
lib/core/partsReorder.ts   buyurtma nuqtasi
lib/core/readiness.ts      K_tt va bekor turish soati
lib/core/rng.ts            mulberry32
lib/core/simulator.ts      Monte-Karlo, sezgirlik, parametr tekshiruvi
lib/core/numbers.ts        parseDecimal
lib/db/schema.ts           entity turlari, SCHEMA_VERSION, migrate
lib/db/storage.ts          createCollection, settings doc, xatolar
lib/db/index.ts            db obyekti, initDb (migratsiya + seed)
lib/db/backup.ts           eksport/import, CSV
lib/services/tractors.ts   ro'yxatga olish, ko'rinish (view), qayta hisoblash
lib/services/motoReadings.ts
lib/services/service.ts
lib/services/alerts.ts     eslatmalar va buyurtma takliflari
lib/session.tsx            SessionProvider/useSession (AuthProvider o'rniga)
lib/i18n/uz.ts
__tests__/...              har bir modul uchun
```

---

### Task 1: Test muhiti, turlar va yuklanish koeffitsienti

**Files:**
- Modify: `package.json` (jest konfiguratsiyasi, `test` skripti)
- Create: `jest.setup.ts`, `lib/core/types.ts`, `lib/core/defaults.ts`, `lib/core/loadFactor.ts`, `lib/core/numbers.ts`
- Test: `__tests__/core/loadFactor.test.ts`, `__tests__/core/numbers.test.ts`

**Interfaces — Produces:**
```ts
type OperationType = { id: string; name: string; fuelLph: number; source: string; verified: boolean };
type WorkShare = { operationTypeId: string; hours: number };
type PartSpec = { name: string; quantity: number; leadDays: number };
type RegulationLevel = { code: string; name: string; intervalHours: number; kind: 'once' | 'periodic'; covers: string[]; parts: PartSpec[]; durationHours: number };
type CoreSettings = { nominalFuelLph: number; gamma: number; calendarMonths: number; dueSoonFraction: number; reorderBufferDays: number; shiftHoursPerDay: number; kMin: number; kMax: number };
type LevelCounter = { code: string; physSince: number; equivSince: number; lastServiceDate: string; done: boolean };
loadFactor(op: OperationType, s: CoreSettings): number
fuelLoadFactor(fuelLiters: number, hours: number, s: CoreSettings): number
equivalentHours(shares: WorkShare[], ops: OperationType[], s: CoreSettings, fuelLiters?: number): number
parseDecimal(text: string): number | null
```

- [ ] **Step 1: O'rnatish.** `npm install`, so'ng `npx expo install jest-expo jest @types/jest @react-native-async-storage/async-storage expo-file-system expo-image-manipulator expo-document-picker expo-sharing`. `package.json` ga `"test": "jest"` va `"jest": { "preset": "jest-expo", "setupFiles": ["<rootDir>/jest.setup.ts"] }`. `jest.setup.ts` AsyncStorage'ni rasmiy mock bilan almashtiradi (`@react-native-async-storage/async-storage/jest/async-storage-mock`).
- [ ] **Step 2: `defaults.ts`** — Global Constraints dagi sozlamalar; reglament jadvali spec 4.3 (nomlar: "Obkatka TXK-50", "Obkatka TXK-100", "TXK-1: dvigatel moyi va filtri", "TXK-2: yoqilg'i va havo filtrlari", "TXK-3: transmissiya moyi"; davomiylik 2/2/1/1.5/3 soat; qismlar `parts_needed` dan, `leadDays: 7`); ish turlari spec 4.1 jadvali (`id`: `plowing, chisel, disking, cultivation, sowing, transport, idle`; `source: "Taxminiy — manba bilan tasdiqlansin"`).
- [ ] **Step 3: Muvaffaqiyatsiz testlar.**
```ts
test('K = G / G_nom', () => expect(loadFactor(op('plowing', 24), S)).toBeCloseTo(1.333, 3));
test('K cheklanadi', () => { expect(loadFactor(op('x', 100), S)).toBe(2.0); expect(loadFactor(op('y', 1), S)).toBe(0.2); });
test('yoqilg\'i bo\'yicha K', () => expect(fuelLoadFactor(90, 5, S)).toBeCloseTo(1.0, 3)); // 18 l/soat
test('T_ekv aralash', () => expect(equivalentHours([{operationTypeId:'plowing',hours:3},{operationTypeId:'transport',hours:2}], OPS, S)).toBeCloseTo(3*24/18 + 2*10/18, 3));
test('yoqilg\'i berilsa jadval o\'rniga', () => expect(equivalentHours([{operationTypeId:'sowing',hours:4}], OPS, S, 96)).toBeCloseTo(4*(96/4)/18, 3));
test('noma\'lum ish turi xato', () => expect(() => equivalentHours([{operationTypeId:'??',hours:1}], OPS, S)).toThrow());
test('parseDecimal', () => { expect(parseDecimal('8,5')).toBe(8.5); expect(parseDecimal(' 245 ')).toBe(245); expect(parseDecimal('abc')).toBeNull(); expect(parseDecimal('')).toBeNull(); });
```
- [ ] **Step 4:** `npx jest __tests__/core` → FAIL (modul yo'q).
- [ ] **Step 5:** Funksiyalarni yozish. `fuelLoadFactor` ham `[kMin, kMax]` ga cheklanadi; `hours <= 0` bo'lsa xato.
- [ ] **Step 6:** `npx jest __tests__/core && npx tsc --noEmit` → PASS (tsc'dagi eski Supabase xatolari bo'lsa, ular Task 14 gacha qoladi — faqat yangi fayllarda xato yo'qligini tekshiring: `npx tsc --noEmit 2>&1 | grep "lib/core"` bo'sh).
- [ ] **Step 7:** Commit `feat(core): ish turlari, yuklanish koeffitsienti, test muhiti`.

### Task 2: Reglament — hisoblagichlar, holat, TXK qo'llash, replay

**Files:** Create `lib/core/regulation.ts`; Test `__tests__/core/regulation.test.ts`

**Interfaces:**
- Consumes: Task 1 turlari, `DEFAULT_REGULATION`, `DEFAULT_SETTINGS`.
- Produces:
```ts
type LevelStatus = { code: string; name: string; remainingHours: number; state: 'ok' | 'soon' | 'overdue'; reason: 'equiv' | 'phys' | 'calendar' | null };
type ReplayEvent =
  | { type: 'reading'; date: string; physHours: number; equivHours: number }
  | { type: 'service'; date: string; levelCode: string };
initialCounters(levels: RegulationLevel[], initialReading: number, date: string): LevelCounter[]
advanceCounters(c: LevelCounter[], physHours: number, equivHours: number): LevelCounter[]
evaluateLevels(c: LevelCounter[], levels: RegulationLevel[], s: CoreSettings, totalReading: number, today: string): LevelStatus[]
recommendedLevel(statuses: LevelStatus[], levels: RegulationLevel[]): string | null
nextDue(statuses: LevelStatus[]): LevelStatus | null
applyService(c: LevelCounter[], levels: RegulationLevel[], code: string, date: string): LevelCounter[]
replayCounters(levels: RegulationLevel[], initialReading: number, registrationDate: string, events: ReplayEvent[]): LevelCounter[]
```

Qoidalar (testlar belgilamaydigan joylar):
- `initialCounters`: davriy daraja uchun `physSince = equivSince = initialReading % H`; bir martalik daraja `done = initialReading >= H`; `lastServiceDate = date`. (Ro'yxatga olishgacha TXK reglament bo'yicha bajarilgan deb faraz qilinadi.)
- `evaluateLevels`: davriy uchun `remaining = min(H − equivSince, gamma·H − physSince)`; `reason` — qaysi shart birinchi yetgan; `lastServiceDate + calendarMonths` ≤ `today` → `overdue`, `reason: 'calendar'`, `remaining = 0`. Bir martalik (`done=false`): `remaining = H − totalReading`, `done=true` bo'lsa ro'yxatga kirmaydi. `state`: `remaining ≤ 0` → overdue; `remaining ≤ dueSoonFraction·H` → soon; aks holda ok. `remainingHours` 1 xonagacha yaxlitlanadi.
- `recommendedLevel`: `overdue` holatdagilar ichida eng katta `intervalHours`; yo'q bo'lsa `null`.
- `nextDue`: eng kichik `remainingHours`.
- `applyService`: `code` va uning `covers` darajalarida `physSince = equivSince = 0`, `lastServiceDate = date`; bir martalik bo'lsa `done = true`.
- `replayCounters`: hodisalarni berilgan tartibda qo'llaydi (chaqiruvchi sanasi bo'yicha tartiblaydi).

- [ ] **Step 1: Muvaffaqiyatsiz testlar** (K=1 uchun `phys = equiv`):
```ts
test('245 m/s → T250 da 5 soat, soon', () => { const c = initialCounters(L, 245, D0); const st = byCode(evaluateLevels(c, L, S, 245, D0), 'T250'); expect(st.remainingHours).toBe(5); expect(st.state).toBe('soon'); });
test('180 m/s → T250 da 70 soat, ok', () => { const st = byCode(evaluateLevels(initialCounters(L, 180, D0), L, S, 180, D0), 'T250'); expect(st.remainingHours).toBe(70); expect(st.state).toBe('ok'); });
test('davriy: 1250 da T250 qayta keladi', () => { let c = replayCounters(L, 0, D0, readingsTo(1250) /* har 50 soatda reading; service: O50@50, O100@100, T250@250, T500@500, T250@750, T1000@1000 */); expect(byCode(evaluateLevels(c, L, S, 1250, D1), 'T250').state).toBe('overdue'); });
test('obkatka bir marta', () => { let c = initialCounters(L, 0, D0); c = advanceCounters(c, 50, 50); expect(byCode(evaluateLevels(c, L, S, 50, D0), 'O50').state).toBe('overdue'); c = applyService(c, L, 'O50', D0); expect(evaluateLevels(c, L, S, 60, D0).find(x => x.code === 'O50')).toBeUndefined(); });
test('T1000 T500 va T250 ni qamraydi', () => { let c = advanceCounters(initialCounters(L, 0, D0), 1000, 1000); c = applyService(c, L, 'T1000', D1); for (const k of ['T250','T500','T1000']) expect(c.find(x => x.code === k)!.physSince).toBe(0); });
test('og\'ir yuklanish TXK ni oldinga suradi', () => { const c = advanceCounters(initialCounters(L, 0, D0), 200, 260); const st = byCode(evaluateLevels(c, L, S, 200, D0), 'T250'); expect(st.state).toBe('overdue'); expect(st.reason).toBe('equiv'); });
test('yengil yuklanish uzaytirmaydi (gamma=1)', () => { const c = advanceCounters(initialCounters(L, 0, D0), 250, 150); const st = byCode(evaluateLevels(c, L, S, 250, D0), 'T250'); expect(st.state).toBe('overdue'); expect(st.reason).toBe('phys'); });
test('12 oy kalendar sharti', () => { const st = byCode(evaluateLevels(initialCounters(L, 10, '2025-01-01'), L, S, 10, '2026-01-01'), 'T250'); expect(st.reason).toBe('calendar'); });
test('1300 m/s bilan ro\'yxat: obkatka yo\'q, T250 qoldiq 50', () => { const c = initialCounters(L, 1300, D0); const st = evaluateLevels(c, L, S, 1300, D0); expect(st.find(x => x.code === 'O50')).toBeUndefined(); expect(byCode(st, 'T250').remainingHours).toBe(200); expect(byCode(st, 'T1000').remainingHours).toBe(700); });
test('recommendedLevel eng yuqori overdue', () => { const c = advanceCounters(initialCounters(L, 0, D0), 1000, 1000); expect(recommendedLevel(evaluateLevels(applyService(applyService(c, L, 'O50', D0), L, 'O100', D0), L, S, 1000, D0), L)).toBe('T1000'); });
```
- [ ] **Step 2:** `npx jest __tests__/core/regulation` → FAIL.
- [ ] **Step 3:** `lib/core/regulation.ts` ni yozish (yuqoridagi qoidalar).
- [ ] **Step 4:** → PASS. **Step 5:** Commit `feat(core): davriy ierarxik reglament va moslashuvchan muddat`.

### Task 3: Prognoz, buyurtma nuqtasi, K_tt

**Files:** Create `lib/core/forecast.ts`, `lib/core/partsReorder.ts`, `lib/core/readiness.ts`; Test `__tests__/core/forecast.test.ts`, `__tests__/core/readiness.test.ts`

**Interfaces — Produces:**
```ts
type DailyEquiv = { date: string; equivHours: number };
dailyIntensity(daily: DailyEquiv[], today: string, windowDays = 14, alpha = 0.3, minDays = 3): number | null
forecastDue(remainingHours: number, intensity: number | null, today: string): { days: number; date: string } | null
needsReorder(level: RegulationLevel, remainingHours: number, forecastDays: number | null, hasOpenRequest: boolean, bufferDays: number): boolean
downtimeHours(openedAt: string, closedAt: string, shiftHoursPerDay: number): number
technicalReadiness(work: number, service: number, downtime: number): number | null
```
Algoritm: `dailyIntensity` — `today` dan oldingi 14 kalendar kun qatori, bir kunda bir nechta yozuv bo'lsa yig'iladi, yozuvsiz kun = 0; yozuvli kunlar < `minDays` → `null`; EMA birinchi yozuvli kundan boshlanadi (`ema₀ = x₀`, `emaₖ = α·xₖ + (1−α)·emaₖ₋₁`). `forecastDue`: `remaining ≤ 0` → `{days: 0, date: today}`; `intensity` null yoki 0 → null; `days = ceil(remaining / intensity)`. `needsReorder`: `hasOpenRequest` → false; `remaining ≤ 0` → true; `forecastDays` null → false; aks holda `forecastDays ≤ max(leadDays) + bufferDays`. `downtimeHours = (closed − opened)/86 400 000 · shiftHoursPerDay`.

- [ ] **Step 1: Testlar.**
```ts
test('2 kunlik ma\'lumot → null', () => expect(dailyIntensity([{date:'2026-10-30',equivHours:8},{date:'2026-10-31',equivHours:8}], '2026-11-01')).toBeNull());
test('doimiy 8 soat → 8', () => expect(dailyIntensity(days('2026-10-20', 12, 8), '2026-11-01')).toBeCloseTo(8, 5));
test('245 m/s, 5 soat qoldi, 8 soat/kun → 1 kun', () => expect(forecastDue(5, 8, '2026-11-02')).toEqual({ days: 1, date: '2026-11-03' }));
test('buyurtma: 9 kun ≤ 7+3', () => expect(needsReorder(T250, 70, 9, false, 3)).toBe(true));
test('buyurtma: ochiq so\'rov bor', () => expect(needsReorder(T250, 70, 9, true, 3)).toBe(false));
test('buyurtma: 11 kun > 10', () => expect(needsReorder(T250, 90, 11, false, 3)).toBe(false));
test('K_tt', () => expect(technicalReadiness(900, 30, 70)).toBeCloseTo(0.9, 5));
test('K_tt bo\'sh → null', () => expect(technicalReadiness(0, 0, 0)).toBeNull());
test('bekor: 1.5 kun × 10', () => expect(downtimeHours('2026-11-01T08:00:00Z', '2026-11-02T20:00:00Z', 10)).toBeCloseTo(15, 5));
```
- [ ] **Step 2:** FAIL. **Step 3:** Yozish. **Step 4:** PASS. **Step 5:** Commit `feat(core): prognoz, buyurtma nuqtasi, texnik tayyorlik`.

### Task 4: Simulyator

**Files:** Create `lib/core/rng.ts`, `lib/core/simulator.ts`; Test `__tests__/core/simulator.test.ts`

**Interfaces:**
- Consumes: `equivalentHours`/`loadFactor` (Task 1), `dailyIntensity` emas — simulyatorda jadallik ma'lum o'rtacha deb olinadi.
- Produces:
```ts
mulberry32(seed: number): () => number
type SimParams = { tractors: number; seasonDays: number; dailyHoursMin: number; dailyHoursMax: number; operationMix: { operationTypeId: string; share: number }[]; intervalHours: number; leadDays: number; serviceDurationHours: number; costService: number; costRepair: number; costDowntimeHour: number; lambda0: number; wearA: number; repairDays: number; beta: number; runs: number; seed: number };
type Stat = { mean: number; lo: number; hi: number };
type StrategySummary = { readiness: Stat; failures: Stat; services: Stat; downtimeHours: Stat; totalCost: Stat };
validateSimParams(p: SimParams): Record<string, string>   // bo'sh = to'g'ri
simulate(p: SimParams, ops: OperationType[], s: CoreSettings, onProgress?: (done: number) => void): Promise<{ s1: StrategySummary; s2: StrategySummary }>
sensitivity(p: SimParams, ops: OperationType[], s: CoreSettings, betas?: number[]): Promise<{ beta: number; costDiff: Stat }[]>  // S2 − S1, betas default [0,0.25,0.5,0.75,1]
DEFAULT_SIM_PARAMS: SimParams  // N=10, D=180, 6–12 soat, mix: plowing .3 cultivation .3 sowing .2 transport .2, H=250, L=7, 1 soat, 1 500 000 / 12 000 000 / 150 000 so'm, λ0=0.0005, a=4, repairDays=3, beta=0.5, R=200, seed=42
```
Model (spec 4.7) — kod tanasi testlar bilan aniqlanmaydigan joylar:
- Har takror `r` va traktor uchun har kuni tasodifiy qiymatlar **bir marta** olinadi: ish soati `U(min,max)`, ish turi (`operationMix` bo'yicha), nosozlik uchun `u`. Ikkala strategiya shu massivlardan o'qiydi (umumiy tasodifiy sonlar). Seed: `p.seed + r`.
- Traktor ta'mirda yoki TXK kunida ishlamaydi (TXK kuni ish soati `max(0, t − serviceDurationHours)`).
- Yeyilish `W += t · K^β`; nosozlik `u < 1 − exp(−λ0 · t · (1 + a · max(0, W/H − 1)²))` → `repairDays` kun to'xtash, bekor soat `repairDays · shiftHoursPerDay`. TXK `W = 0` qiladi.
- S1: `phys ≥ H` bo'lgan kuni qismlar buyuriladi, `leadDays` dan keyin keladi, kelgan kuni TXK. S2: `equiv ≥ H` yoki `phys ≥ gamma·H`; qismlar `(H − equiv)/μ ≤ leadDays + reorderBufferDays` bo'lganda buyuriladi (μ — mix bo'yicha kutilgan kunlik keltirilgan soat), TXK muddati kelib qismlar bor bo'lsa — o'sha kuni.
- Simulyator faqat T250 intervalini (`intervalHours`) modellashtiradi — ekranda shu soddalashtirish yoziladi.
- `readiness = work/(work + serviceHours + downtimeHours)`; `totalCost = services·costService + failures·costRepair + downtimeHours·costDowntimeHour`; `Stat` — takrorlar bo'yicha o'rtacha, `±1.96·sd/√R`.
- Har 20 takrordan keyin `await new Promise(r => setTimeout(r, 0))` va `onProgress`.

- [ ] **Step 1: Testlar.**
```ts
test('mulberry32 deterministik', () => { const a = mulberry32(1), b = mulberry32(1); expect([a(),a()]).toEqual([b(),b()]); });
test('bir xil seed → bir xil natija', async () => expect(await simulate(P, OPS, S)).toEqual(await simulate(P, OPS, S)));
test('og\'ir mix: S2 TXK soni ≥ S1', async () => { const r = await simulate({ ...P, operationMix: [{ operationTypeId: 'plowing', share: 1 }] }, OPS, S); expect(r.s2.services.mean).toBeGreaterThanOrEqual(r.s1.services.mean); });
test('lambda0=0, a=0 → nosozlik 0', async () => { const r = await simulate({ ...P, lambda0: 0 }, OPS, S); expect(r.s1.failures.mean).toBe(0); expect(r.s2.failures.mean).toBe(0); });
test('readiness 0..1', async () => { const r = await simulate(P, OPS, S); for (const x of [r.s1, r.s2]) { expect(x.readiness.mean).toBeGreaterThan(0); expect(x.readiness.mean).toBeLessThanOrEqual(1); } });
test('sensitivity 5 nuqta', async () => expect((await sensitivity({ ...P, runs: 10 }, OPS, S)).map(x => x.beta)).toEqual([0, 0.25, 0.5, 0.75, 1]));
test('chegaralar', () => { const e = validateSimParams({ ...P, tractors: 0, runs: 5000, seasonDays: 400, dailyHoursMax: 30 }); expect(Object.keys(e).sort()).toEqual(['dailyHoursMax', 'runs', 'seasonDays', 'tractors']); });
test('mix ulushlari yig\'indisi 1 bo\'lishi kerak', () => expect(validateSimParams({ ...P, operationMix: [{ operationTypeId: 'plowing', share: 0.5 }] })).toHaveProperty('operationMix'));
```
Chegaralar: `1 ≤ tractors ≤ 100`, `1 ≤ seasonDays ≤ 365`, `0 < dailyHoursMin ≤ dailyHoursMax ≤ 24`, `1 ≤ runs ≤ 1000`, `0 ≤ beta ≤ 1`, mix yig'indisi `|Σ−1| < 0.001`, qolgan son maydonlar ≥ 0. Xabarlar o'zbekcha.
- [ ] **Step 2:** FAIL. **Step 3:** Yozish (P = `DEFAULT_SIM_PARAMS` with `runs: 20`). **Step 4:** PASS, test vaqti < 10 s. **Step 5:** Commit `feat(core): Monte-Karlo simulyatori va sezgirlik tahlili`.

### Task 5: Mahalliy ombor, sxema, seed, zaxira

**Files:** Create `lib/db/schema.ts`, `lib/db/storage.ts`, `lib/db/index.ts`, `lib/db/backup.ts`; Test `__tests__/db/storage.test.ts`, `__tests__/db/backup.test.ts`

**Interfaces — Produces:**
```ts
// schema.ts
type Role = 'operator' | 'technician' | 'admin';
type User = { id: string; name: string; role: Role; pinHash: string | null; active: boolean; createdAt: string };
type Tractor = { id: string; model: string; serialNumber: string; registrationDate: string; location: string; operatorName: string; photoUri: string | null; initialReading: number; status: 'active' | 'maintenance' | 'inactive'; createdAt: string };
type MotoReading = { id: string; tractorId: string; date: string; reading: number; physHours: number; shares: WorkShare[]; fuelLiters: number | null; equivHours: number; userId: string; note: string | null; createdAt: string };
type ServiceRecord = { id: string; tractorId: string; levelCode: string; date: string; reading: number; durationHours: number; usedParts: { name: string; quantity: number }[]; note: string | null; photoUris: string[]; userId: string; createdAt: string };
type PartsRequest = { id: string; tractorId: string; partName: string; quantity: number; urgency: 'urgent' | 'medium' | 'normal'; levelCode: string | null; status: 'pending' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled'; requestedBy: string; requestDate: string; deliveredAt: string | null; notes: string | null; createdAt: string };
type MechanicRequest = { id: string; tractorId: string; problem: string; status: 'pending' | 'in_progress' | 'completed'; openedAt: string; closedAt: string | null; userId: string; technicianId: string | null; technicianNotes: string | null; createdAt: string };
type DamageReport = { id: string; tractorId: string; description: string; photoUris: string[]; date: string; userId: string; createdAt: string };
type AppNotification = { id: string; tractorId: string; kind: 'service_soon' | 'service_overdue' | 'reorder' | 'mechanic'; levelCode: string | null; message: string; dedupeKey: string; isRead: boolean; createdAt: string };
SCHEMA_VERSION = 1
migrate(data: BackupData, fromVersion: number): BackupData
// storage.ts
class StorageError extends Error {}           // message o'zbekcha
class CorruptDataError extends Error { key: string }
createCollection<T extends { id: string }>(key: string): { list(): Promise<T[]>; get(id: string): Promise<T | null>; insert(item: Omit<T, 'id'>): Promise<T>; update(id: string, patch: Partial<T>): Promise<T>; remove(id: string): Promise<void>; replaceAll(items: T[]): Promise<void> }
newId(): string
// index.ts
db: { users; tractors; motoReadings; serviceRecords; partsRequests; mechanicRequests; damageReports; notifications; operationTypes; regulation; settings: { get(): Promise<CoreSettings>; set(s: CoreSettings): Promise<void> } }
initDb(): Promise<void>     // migratsiya + bo'sh bo'lsa seed (reglament, ish turlari, sozlamalar, admin "Administrator" PIN'siz, namunaviy "Claas Arion 630" 0 m/s)
// backup.ts
type BackupData = { schemaVersion: number; exportedAt: string; collections: Record<string, unknown[]>; settings: CoreSettings };
exportAll(): Promise<BackupData>
importAll(json: string): Promise<void>        // xato → ImportError, ma'lumot o'zgarmaydi; oldin 'backup:auto' kalitiga joriy holat yoziladi
toCsv(rows: Record<string, unknown>[]): string // ; ajratgich, UTF-8 BOM bilan (Excel uchun)
```
- [ ] **Step 1: Testlar.** CRUD aylanmasi; `update` mavjud bo'lmagan id → `StorageError`; kalitdagi buzilgan JSON → `list()` `CorruptDataError`; `initDb()` ikki marta → seed takrorlanmaydi (traktorlar soni 1); `exportAll → importAll` aylanmasi teng; `importAll('{"foo":1}')` → `ImportError`, oldingi traktorlar saqlanib qolgan; `schemaVersion: 2` (kelajak) → rad; `schemaVersion` yo'q (0) → `migrate` orqali qabul (v0 = kolleksiyalar bor, sozlamalar yo'q → default qo'shiladi); `toCsv([{a:1,b:'x;y'}])` → `'﻿a;b\r\n1;"x;y"'`.
- [ ] **Step 2:** FAIL. **Step 3:** Yozish. Barcha yozuvlar ketma-ket navbat (`Promise` zanjiri) orqali — bir vaqtdagi ikki `insert` biri ikkinchisini o'chirmasin (test: `Promise.all` 20 ta insert → 20 ta yozuv). **Step 4:** PASS. **Step 5:** Commit `feat(db): oflayn ombor, migratsiya, seed va zaxira`.

### Task 6: Servislar — moto-soat, TXK, eslatmalar

**Files:** Create `lib/services/tractors.ts`, `lib/services/motoReadings.ts`, `lib/services/service.ts`, `lib/services/alerts.ts`; Test `__tests__/services/*.test.ts`

**Interfaces:**
- Consumes: Task 1–5.
- Produces:
```ts
type TractorView = { tractor: Tractor; currentReading: number; totalEquivHours: number; statuses: LevelStatus[]; next: LevelStatus | null; recommended: string | null; forecast: { days: number; date: string } | null; color: 'green' | 'yellow' | 'red' };
registerTractor(input: Omit<Tractor, 'id' | 'createdAt' | 'status'>): Promise<Tractor>
getTractorView(tractorId: string, today: string): Promise<TractorView>
listTractorViews(today: string): Promise<TractorView[]>
type ReadingError = 'not_number' | 'decreasing' | 'date_before_last' | 'shares_mismatch' | 'over_24h_needs_confirm';
recordMotoReading(input: { tractorId: string; date: string; reading: number; shares: WorkShare[]; fuelLiters: number | null; note: string | null; userId: string; confirmOver24h?: boolean }): Promise<{ ok: true; reading: MotoReading } | { ok: false; error: ReadingError }>
deleteMotoReading(id: string): Promise<void>      // faqat traktorning oxirgi yozuvi; aks holda StorageError
recordService(input: Omit<ServiceRecord, 'id' | 'createdAt' | 'reading'>): Promise<ServiceRecord>  // reading = joriy hisoblagich
refreshAlerts(tractorId: string, today: string): Promise<AppNotification[]>  // faqat yangi yaratilganlar
```
Qoidalar: `shares` bitta va `hours` 0 bo'lsa → avtomatik `physHours` ga to'ldiriladi; `|Σshares − physHours| > 0.01` → `shares_mismatch`. `physHours / max(1, kunlar farqi) > 24` va tasdiq yo'q → `over_24h_needs_confirm`. Hisoblagichlar `replayCounters` bilan (yozuvlar va TXK sana, keyin `createdAt` bo'yicha). Har saqlash/o'chirishdan keyin `refreshAlerts`. Eslatma matnlari: soon — `"{nomi}: {qolgan} soat qoldi"`, overdue — `"{nomi}: muddati {|qolgan|} soatga o'tdi"`, kalendar — `"{nomi}: 12 oydan beri bajarilmagan"`, reorder — `"{nomi} uchun ehtiyot qismlarni buyurtma qiling (≈{kun} kun qoldi)"`. `dedupeKey = ${tractorId}:${code}:${state}:${counter.lastServiceDate}` — har TXK siklida eslatma qayta chiqadi, bitta siklda takrorlanmaydi. `color`: biror overdue → red, biror soon → yellow, aks holda green.

- [ ] **Step 1: Testlar.** (a) 0 m/s traktor → 245 gacha bir necha yozuv (K=1 bo'lishi uchun test fiksturasida `{ id: 'ref', fuelLph: 18 }` ish turi ishlatiladi), O50/O100 TXK yozilgan → `next` T250, `remainingHours` 5, eslatma matni `"TXK-1: dvigatel moyi va filtri: 5 soat qoldi"`; (b) 180 → 70, eslatma yo'q; (c) kamayuvchi hisoblagich → `decreasing`; (d) oldingi sana → `date_before_last`; (e) 1 kunda 30 soat → `over_24h_needs_confirm`, `confirmOver24h: true` bilan → ok; (f) 2450 xato yozuvi → `deleteMotoReading` → `currentReading` qaytadi va T250 qoldiq oldingiga teng; (g) `refreshAlerts` ikki marta → ikkinchisi `[]`; (h) T250 TXK yozilgach keyingi siklda soon eslatmasi yana yaratiladi; (i) 9 kunlik prognozda reorder eslatmasi va ochiq `PartsRequest` yaratilgandan keyin takrorlanmasligi.
- [ ] **Step 2:** FAIL. **Step 3:** Yozish. **Step 4:** PASS. **Step 5:** Commit `feat(services): moto-soat, TXK va eslatmalar oqimi`.

### Task 7: Sessiya, foydalanuvchilar, huquqlar, o'zbekcha matnlar

**Files:**
- Create: `lib/session.tsx`, `lib/i18n/uz.ts`, `app/select-user.tsx`, `app/users-admin.tsx`
- Modify: `app/_layout.tsx` (AuthProvider → SessionProvider, `initDb`, CorruptDataError → tiklash ekrani), `lib/permissions.ts` (`UserProfile` → `User`, `is_active` → `active`, rol nomlari: Operator / Texnik / Administrator)
- Delete: `app/login.tsx`, `app/register.tsx`, `components/AuthProvider.tsx`, `lib/auth.ts`
- Test: `__tests__/session.test.ts`

**Interfaces — Produces:**
```ts
useSession(): { user: User | null; loading: boolean; signIn(userId: string, pin: string | null): Promise<boolean>; signOut(): Promise<void> }
hashPin(pin: string): string   // FNV-1a hex; xavfsizlik vositasi emas
t: typeof uz                    // import { t } from '@/lib/i18n/uz'
```
- [ ] **Step 1: Testlar.** `hashPin('1234')` barqaror va `'1235'` dan farqli; PIN'li foydalanuvchiga noto'g'ri PIN → `signIn` false; PIN'siz → true; tanlangan foydalanuvchi id `session:userId` kalitida saqlanadi va qayta ochilganda tiklanadi.
- [ ] **Step 2:** FAIL → yozish → PASS.
- [ ] **Step 3:** `select-user`: foydalanuvchilar kartochkalari, PIN maydoni (agar bor). `users-admin` (faqat admin): qo'shish, rol, PIN, faolsizlantirish. Root layout: sessiya yo'q → `/select-user`.
- [ ] **Step 4:** `npx expo start --web` bilan tekshirish: ilova ochiladi, Administrator tanlanadi, bosh sahifaga o'tadi (bosh sahifa hali eski bo'lsa, xato chiqishi Task 8 gacha kutiladi — faqat tanlash oqimi tekshiriladi).
- [ ] **Step 5:** Commit `feat: qurilmadagi foydalanuvchilar va o'zbekcha matnlar`.

### Task 8: Bosh sahifa va traktorlar

**Files:** Modify `app/(tabs)/index.tsx`, `components/TractorCard.tsx`, `components/DashboardHeader.tsx`, `components/FilterTabs.tsx`, `app/add-tractor.tsx`, `app/tractor-details.tsx`, `app/navigator.tsx`, `components/MediaUploader.tsx`; Delete `lib/tractorStatus.ts`, `lib/maintenanceTracking.ts`, `lib/notifications.ts`, `lib/mediaUpload.ts`; Create `lib/media.ts`

**Interfaces:**
- Consumes: `listTractorViews`, `getTractorView`, `registerTractor`, `useSession`, `Permissions`, `t`.
- Produces: `saveImage(uri: string): Promise<string>` (`lib/media.ts`: `expo-image-manipulator` bilan eng uzun tomoni 1280 px, `FileSystem.documentDirectory + 'media/'` ga nusxa; vebda data-URI qaytaradi).

- [ ] **Step 1:** TractorCard: model, seriya, joy, operator; joriy hisoblagich va keltirilgan soat; `next` darajasi nomi va qoldiq ("70 soat resurs bor" / "5 soat qoldi" / "muddati N soatga o'tdi"); prognoz sanasi; rang `color`.
- [ ] **Step 2:** Bosh sahifa filtrlari: barchasi / me'yorida / yaqinlashmoqda / muddati o'tgan; navigator menyusi yangi ekranlarga havolalar bilan (Simulyator, Reglament, Zaxira, Foydalanuvchilar — huquq bo'yicha).
- [ ] **Step 3:** Traktor qo'shish: model (default "Claas Arion 630"), seriya, joy, operator ismi, ro'yxat sanasi, boshlang'ich hisoblagich (`parseDecimal`), rasm. Tafsilotlar: barcha darajalar holati jadvali, prognoz, oxirgi yozuvlar.
- [ ] **Step 4:** `npx tsc --noEmit 2>&1 | grep -E "app/\(tabs\)|TractorCard|add-tractor|tractor-details|lib/media"` bo'sh; vebda: traktor qo'shish 180 m/s → kartochkada "70 soat resurs bor".
- [ ] **Step 5:** Commit `feat(ui): bosh sahifa va traktorlar oflayn ombor bilan`.

### Task 9: Moto-soat, TXK yozuvi va tarixi, eslatmalar

**Files:** Modify `app/add-moto-hours.tsx`, `app/add-service-record.tsx`, `app/service-history.tsx`, `app/notifications.tsx`

- [ ] **Step 1: Moto-soat ekrani:** traktor, sana, hisoblagich, ish taqsimoti (qator qo'shish: ish turi + soat; bitta qator bo'lsa soat avtomatik), ixtiyoriy yoqilg'i, izoh; oldingi ko'rsatkich va hisoblangan ish soati jonli ko'rsatiladi; `ReadingError` ning har biri uchun `t` dagi xabar; `over_24h_needs_confirm` → tasdiqlash dialogi va qayta chaqirish. Ro'yxatda oxirgi yozuvni o'chirish tugmasi (huquq: operator/admin).
- [ ] **Step 2: TXK yozuvi:** daraja tanlash (`recommended` oldindan tanlangan), reglamentdagi qismlar ro'yxati oldindan to'ldirilgan, davomiylik, izoh, rasmlar → `recordService`.
- [ ] **Step 3:** Tarix: yozuvlar sana bo'yicha, daraja nomi bilan. Eslatmalar: `db.notifications`, o'qildi belgisi, turi bo'yicha rang.
- [ ] **Step 4:** Vebda: 245 m/s gacha kiritish → eslatmada "TXK-1: dvigatel moyi va filtri: 5 soat qoldi"; T250 yozish → kartochka yashil. `tsc` shu fayllarda toza.
- [ ] **Step 5:** Commit `feat(ui): moto-soat, TXK yozuvi va eslatmalar`.

### Task 10: Ehtiyot qismlar, mexanik, shikast

**Files:** Modify `app/request-parts.tsx`, `app/parts-history.tsx`, `app/parts-admin.tsx`, `app/request-mechanic.tsx`, `app/mechanic-requests.tsx`, `app/report-damage.tsx`, `app/profile.tsx`

- [ ] **Step 1:** Qism so'rovi: nomi, miqdor, shoshilinchlik (shoshilinch / o'rtacha / oddiy), izoh; reorder eslatmasidan ochilganda daraja qismlari oldindan to'ldiriladi (`levelCode` bilan). Admin: holat o'zgartirish (kutilmoqda → buyurtma qilindi → yo'lda → yetkazildi / bekor), `deliveredAt`. Tarix: so'rovchi, sana, yetkazish sanasi.
- [ ] **Step 2:** Mexanik: operator muammoni yozadi (`openedAt`), texnik qabul qiladi (`in_progress`, `technicianId`), yakunlaydi (`closedAt`, izoh). Yangi so'rov `mechanic` eslatmasi yaratadi.
- [ ] **Step 3:** Shikast hisoboti rasmlar bilan (`saveImage`). Profil: joriy foydalanuvchi, rol, "Foydalanuvchini almashtirish".
- [ ] **Step 4:** Vebda har bir oqim bir marta; `tsc` shu fayllarda toza. **Step 5:** Commit `feat(ui): qismlar, mexanik va shikast oflayn`.

### Task 11: Hisobotlar

**Files:** Modify `lib/reports.ts`, `app/reports.tsx`, `components/reports/*.tsx`; Create `components/reports/ReadinessReport.tsx`, `components/reports/OperatorActivityReport.tsx`; Test `__tests__/reports.test.ts`

**Interfaces — Produces:**
```ts
readinessByTractor(from: string, to: string): Promise<{ tractorId: string; model: string; work: number; service: number; downtime: number; kTt: number | null }[]>
physVsEquiv(): Promise<{ tractorId: string; model: string; phys: number; equiv: number; ratio: number }[]>  // ratio = equiv/phys
overdueList(today: string): Promise<{ tractorId: string; model: string; levelName: string; overdueHours: number }[]>
partsUsage(): Promise<{ partName: string; requested: number; delivered: number }[]>
operatorActivity(from: string, to: string): Promise<{ userId: string; name: string; tractorId: string; model: string; hours: number; days: number }[]>
```
- [ ] **Step 1: Testlar** (omborga tayyor yozuvlar bilan): K_tt 900/30/70 → 0.9; `ratio > 1` og'ir ishlatilgan traktor; operator faoliyati soatlari yig'indisi yozuvlarga teng.
- [ ] **Step 2:** FAIL → yozish → PASS.
- [ ] **Step 3:** Ekran: 5 tab — Tayyorlik (K_tt), Fizik vs keltirilgan (ustunli diagramma, `ratio > 1.15` "ortiqcha yuklangan", `< 0.85` "kam yuklangan" belgisi), Muddati o'tgan TXK, Qismlar, Operatorlar. Har birida "CSV" tugmasi (Task 13 dagi `shareCsv`). `TechnicianPerformanceReport` olib tashlanadi (reyting oflaynda ma'nosiz).
- [ ] **Step 4:** Commit `feat(reports): K_tt, fizik/keltirilgan soat, operator faoliyati`.

### Task 12: Simulyator va reglament/ish turlari ekranlari

**Files:** Create `app/simulator.tsx`, `app/regulation-admin.tsx`, `components/sim/ParamForm.tsx`, `components/sim/ResultTable.tsx`, `components/sim/SensitivityChart.tsx`

- [ ] **Step 1: Simulyator:** `DEFAULT_SIM_PARAMS` bilan forma (`parseDecimal`, `validateSimParams` xatolari maydon ostida), "Ishga tushirish" → progress foizi (`onProgress`), natija jadvali: ko'rsatkich | S1 | S2 | farq, har biri `o'rtacha [lo; hi]`; "Sezgirlik" tugmasi → β bo'yicha `costDiff` chiziqli grafik (0 chizig'i bilan) va izoh "manfiy — moslashuvchan usul arzonroq". Pastda Global Constraints dagi ogohlantirish va "Model faqat TXK-1 (250 soat) intervalini modellashtiradi".
- [ ] **Step 2: Reglament (admin):** darajalar jadvali (interval, davomiylik, qismlar va yetkazish kunlari tahrir), ish turlari (G l/soat, manba, "tasdiqlangan" belgisi), sozlamalar (`nominalFuelLph`, `gamma` [0.8; 1.0] oralig'ida, `reorderBufferDays`, `shiftHoursPerDay`). Saqlangach barcha traktorlar uchun `refreshAlerts`.
- [ ] **Step 3:** Vebda: standart parametrlar bilan natija 30 s ichida chiqadi; R=5000 → maydon xatosi.
- [ ] **Step 4:** Commit `feat(ui): simulyator va reglament sozlamalari`.

### Task 13: Zaxira ekrani

**Files:** Create `app/backup.tsx`, `lib/share.ts`

**Interfaces — Produces:** `shareJson(data: BackupData): Promise<void>`, `shareCsv(name: string, csv: string): Promise<void>` (`expo-file-system` ga yozib `expo-sharing`; vebda brauzer yuklab olishi), `pickBackupFile(): Promise<string | null>` (`expo-document-picker`, matnni qaytaradi).

- [ ] **Step 1:** Ekran: "Zaxira nusxa olish" (fayl nomi `txk-zaxira-YYYY-MM-DD.json`), "Zaxiradan tiklash" (tasdiqlash dialogi: "Joriy ma'lumot almashtiriladi"), "Avtomatik zaxiradan qaytarish" (`backup:auto`), oxirgi zaxira sanasi. `ImportError` → tushunarli xabar.
- [ ] **Step 2:** `CorruptDataError` bo'lganda root layout shu ekranga yo'naltiradi (Task 7 dagi tiklash ekrani shu ekran).
- [ ] **Step 3:** Vebda: eksport → ma'lumotni o'zgartirish → import → asl holat. Commit `feat: JSON zaxira va CSV eksport`.

### Task 14: Tozalash va to'liq tekshiruv

**Files:** Delete `lib/supabase.ts`, `lib/liveMonitoring.ts`, `lib/types.ts` (agar ishlatilmasa), `supabase/`, `components/reports/TechnicianPerformanceReport.tsx`; Modify `package.json` (`@supabase/supabase-js`, `react-native-url-polyfill` olib tashlash), `app/_layout.tsx` (Stack ro'yxati yangi ekranlar bilan), `app.json` (`name: "TXK Arion-630"`, `slug: "txk-arion630"`, `android.package: "uz.txk.arion630"`)

- [ ] **Step 1:** `grep -rniE "supabase|Dashboard'|Service Required|Upcoming Service" app components lib` → bo'sh (inglizcha matn qolmagan).
- [ ] **Step 2:** `npx tsc --noEmit` → 0 xato; `npx jest` → hammasi PASS; `npx expo export --platform web` → muvaffaqiyatli.
- [ ] **Step 3:** Vebda to'liq ssenariy: admin → traktor 0 m/s → operator → 50 gacha → texnik O50 → … → 245 da eslatma → qism buyurtmasi → T250 → hisobot K_tt → simulyator → zaxira.
- [ ] **Step 4:** Commit `chore: Supabase olib tashlandi, to'liq tekshiruv`.

### Task 15: Android APK

**Files:** Create `eas.json`; Modify `README.md` (o'rnatish va foydalanish qo'llanmasi, o'zbekcha)

- [ ] **Step 1:** `eas.json`: `{"build":{"preview":{"android":{"buildType":"apk"},"distribution":"internal"}}}`.
- [ ] **Step 2 (foydalanuvchi):** Expo hisobini o'zi ochadi va `npx eas-cli login` ni o'zi bajaradi.
- [ ] **Step 3:** `npx eas-cli build -p android --profile preview` → APK havolasi.
- [ ] **Step 4:** Telefonda: o'rnatish, internetni o'chirib Task 14 Step 3 ssenariysi, ilovani yopib ochish → ma'lumot saqlangan, rasm qo'shish ishlaydi.
- [ ] **Step 5:** README: o'rnatish, rollar, ish oqimi, koeffitsientlarni tasdiqlash zarurligi, zaxira tartibi. Commit `build: EAS APK profili va qo'llanma`.
