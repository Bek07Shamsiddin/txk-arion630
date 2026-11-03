# TXK Arion-630: oflayn ilova va moslashuvchan TXK usuli — dizayn

Sana: 2026-11-02 · Holat: ko'rib chiqishda

## 1. Maqsad va kelishilgan shartlar

**Maqsad.** Bolt.new'da yaratilgan Expo + Supabase ilovasini Claas Arion-630 traktorlariga texnik
xizmat ko'rsatish (TXK) uchun ma'no jihatdan to'g'ri ishlaydigan, internetsiz ishlaydigan Android
ilovaga aylantirish. Ilova PhD ishining ilmiy yangiligini — **keltirilgan moto-soat asosida TXK
davriyligini moslashuvchan aniqlash usuli** va uning imitatsion modelini — amalda ko'rsatadi.

**Foydalanuvchi aytgan shartlar**
- Topshiriladigan natija: faqat ishlaydigan ilova (dissertatsiya matni yozilmaydi).
- Real ekspluatatsiya ma'lumoti yo'q → usul imitatsion model (simulyator) bilan asoslanadi.
- Ilova oflayn: ma'lumot qurilmada saqlanadi, server/Supabase yo'q.
- Topshirish shakli: Android APK.
- Ilmiy matndagi funksiyalar saqlanadi: ro'yxatga olish, moto-soat, TXK eslatmalari, ehtiyot qism
  buyurtmalari, mexanik chaqirish, hisobotlar, operator nazorati.

**Taxminlar (tasdiqlanmagan)**
- Interfeys tili — o'zbek (lotin).
- Ish turlari bo'yicha boshlang'ich yoqilg'i sarfi qiymatlari taxminiy; nomzod ularni adabiyot bilan
  tasdiqlaydi va ilovada admin sifatida tahrirlaydi.
- APK Expo EAS bulutida yig'iladi; Expo hisobini foydalanuvchi o'zi ochadi.

**Muvaffaqiyat mezonlari**
1. Matndagi misollar ilovada aynan chiqadi: 245 m/s → "moy va filtr almashtirishga 5 soat qoldi";
   180 m/s → "70 soat resurs bor".
2. TXK davriy: 1250, 1500, 1750 … m/s da ham eslatma chiqadi; 50 va 100 soatlik obkatka bir marta.
3. Simulyator S1 va S2 strategiyalarini taqqoslab, K_tt, nosozliklar, bekor turish va xarajatni
   ishonch oralig'i bilan ko'rsatadi; β bo'yicha sezgirlik grafigi bor.
4. Ilova internetsiz ishlaydi, ma'lumot JSON zaxiraga eksport/import qilinadi.
5. Yadro unit-testlari va `tsc` xatosiz o'tadi; APK telefonda o'rnatilib ishlaydi.

## 2. Hozirgi loyihada topilgan xatolar

| # | Xato | Oqibati | Yechim |
|---|------|---------|--------|
| 1 | DB trigger `[50,100,250,500,1000]` ni faqat birinchi kesib o'tishda ishlatadi | 1000 m/s dan keyin eslatma yo'q | Davriy, ierarxik reglament (4-bo'lim) |
| 2 | Oraliqlar trigger va `service_intervals` jadvalida turlicha (1500/2000 bor) | Ikki xil haqiqat | Bitta reglament manbasi |
| 3 | 50 va 100 obkatka bir xil nom "Initial Service" | `lastServiceHours` da ustma-ust tushadi | Alohida kod, bir martalik bayroq |
| 4 | Moto-soat "qo'shiladi", matnda esa hisoblagich ko'rsatkichi | Noto'g'ri jami soat | Hisoblagich ko'rsatkichi kiritiladi, delta hisoblanadi |
| 5 | `parts_requests` ikki marta yaratilgan; matnlar inglizcha | Chalkashlik | Supabase olib tashlanadi; o'zbekcha matnlar |

## 3. Arxitektura

```
app/            Expo Router ekranlari (UI)
components/     Qayta ishlatiladigan UI
lib/core/       ILMIY YADRO — sof funksiyalar, saqlash/UI ga bog'liq emas
lib/db/         Mahalliy ombor (repository interfeysi + AsyncStorage)
lib/services/   Yadro + omborni bog'laydigan amallar (masalan, moto-soat saqlash oqimi)
lib/i18n/       O'zbekcha matnlar
```

**Ombor (`lib/db/`)**
- `@react-native-async-storage/async-storage`; har bir to'plam alohida kalit, JSON massiv.
- To'plamlar: `users`, `tractors`, `motoReadings`, `serviceRecords`, `partsRequests`,
  `mechanicRequests`, `damageReports`, `notifications`, `operationTypes`, `regulation`, `settings`.
- Har bir to'plam uchun `list / get / insert / update / remove` interfeysi; ekranlar AsyncStorage'ga
  bevosita murojaat qilmaydi.
- `meta.schemaVersion`; ilova ochilganda migratsiyalar ketma-ket bajariladi.
- Birinchi ishga tushishda seed: reglament, ish turlari, bitta namunaviy Arion-630, bitta admin.
- Yozish xatosi foydalanuvchiga xabar sifatida qaytadi; holat (state) faqat muvaffaqiyatli yozuvdan
  keyin yangilanadi.

**Foydalanuvchilar.** Qurilmadagi ro'yxat: ism, rol (`operator | technician | admin`), ixtiyoriy
4 xonali PIN (xesh). Bu xavfsizlik emas, balki "kim kiritdi" ni qayd etish va noto'g'ri bosishning
oldini olish vositasi. Huquqlar mavjud `permissions.ts` mantig'i bo'yicha.

**Rasmlar.** `expo-image-picker` → `expo-file-system` hujjatlar papkasiga nusxa; yozuvda fayl URI.
Rasm kichraytiriladi (eng uzun tomoni 1280 px).

**Olib tashlanadi:** `@supabase/supabase-js`, `lib/supabase.ts`, `lib/auth.ts`, `lib/liveMonitoring.ts`,
`supabase/migrations/`, telefon bilan ro'yxatdan o'tish/kirish ekranlari, `.env`.

## 4. Ilmiy yadro (`lib/core/`)

### 4.1 Ish turlari va yuklanish koeffitsienti
Har bir ish turi `{ id, nomi, G_l_soat, manba }`. Koeffitsient **Kᵢ = Gᵢ / G_nom**, G_nom —
sozlamalardagi nominal ekspluatatsion sarf (boshlang'ich 18 l/soat, taxminiy).

Boshlang'ich jadval (barchasi **taxminiy**, ilovada "tasdiqlanmagan" belgisi bilan):

| Ish turi | G, l/soat | K |
|----------|-----------|---|
| Haydash | 24 | 1.33 |
| Chizellash | 23 | 1.28 |
| Diskalash | 21 | 1.17 |
| Kultivatsiya | 17 | 0.94 |
| Ekish | 13 | 0.72 |
| Transport | 10 | 0.56 |
| Salt ishlash | 4 | 0.22 |

Agar yozuvda haqiqiy yoqilg'i hajmi `V` (l) kiritilsa, shu yozuv uchun **K = (V / t) / G_nom**
(jadval o'rniga). K qiymati [0.2; 2.0] oralig'ida cheklanadi (o'lchash xatosidan himoya).

### 4.2 Keltirilgan moto-soat
Moto-soat yozuvi: `{ traktor, sana, hisoblagich, ishTaqsimoti: [{ishTuri, soat}], yoqilg'i?, operator, izoh }`.
- Fizik ish soati t = hisoblagich − oldingi hisoblagich; taqsimot soatlari yig'indisi t ga teng
  bo'lishi shart (bitta ish turi bo'lsa, avtomatik t).
- **T_ekv = Σ tᵢ · Kᵢ** (yozuv bo'yicha va jami).

### 4.3 Reglament va moslashuvchan muddat
Reglament (bitta manba, admin tahrirlaydi):

| Kod | Nomi | H, soat | Turi | Qamraydi |
|-----|------|---------|------|----------|
| O50 | Obkatka TXK-50 | 50 | bir martalik | — |
| O100 | Obkatka TXK-100 | 100 | bir martalik | — |
| T250 | TXK-1: dvigatel moyi va filtri | 250 | davriy | — |
| T500 | TXK-2: yoqilg'i, havo filtrlari | 500 | davriy | T250 |
| T1000 | TXK-3: transmissiya moyi | 1000 | davriy | T500, T250 |

Har bir davriy daraja uchun oxirgi bajarilgan TXK dan beri hisoblagichlar: `fiz`, `ekv`, `sana`.
Daraja **muddati keldi**, agar birinchi bo'lib bajarilsa:
1. `ekv ≥ H`, yoki
2. `fiz ≥ γ · H` (γ sozlamada, boshlang'ich 1.0 — ishlab chiqaruvchi intervalidan uzaytirilmaydi), yoki
3. `sana` dan 12 oy o'tdi.

Qolgan resurs: `qolgan = min(H − ekv, γ·H − fiz)` (soatda). Bir vaqtda bir necha daraja kelsa, eng
yuqorisi tavsiya etiladi. Yuqori daraja bajarilganda qamralgan darajalar hisoblagichlari ham nolga
qaytadi. Obkatka darajalari fizik soat bo'yicha bir marta, bajarilgach yopiladi.

Holat chegaralari: `qolgan ≤ 0` → **muddati o'tgan** (qizil); `qolgan ≤ 10% · H` (T250 uchun 25 s)
→ **yaqinlashmoqda** (sariq); aks holda **me'yorida** (yashil).

Matn misollari (barcha ish turi K=1 bo'lganda): 245 m/s, oxirgi TXK yo'q → T250 qolgan 5 s;
180 m/s → qolgan 70 s. Ikkalasi testda.

### 4.4 Prognoz
v (jadallik) — oxirgi 14 kun ichidagi kunlik keltirilgan soatlarning eksponensial silliqlangan o'rtachasi
(α = 0.3); ma'lumot 3 kundan kam bo'lsa, prognoz "ma'lumot yetarli emas". Kunlar = qolgan / v;
taxminiy sana = bugun + kunlar.

### 4.5 Ehtiyot qismlar buyurtma nuqtasi
Har bir daraja → qismlar ro'yxati `{nomi, miqdor, yetkazishKun L}`. Agar `prognozKun ≤ L + zaxiraKun`
(zaxira boshlang'ich 3) va shu daraja uchun ochiq buyurtma bo'lmasa → "qismlarni buyurtma qiling"
eslatmasi va bir bosishda buyurtma yaratish.

### 4.6 Texnik tayyorlik koeffitsienti
Davr uchun: **K_tt = T_ish / (T_ish + T_TXK + T_bekor)**. T_ish — moto-soat yozuvlaridan; T_TXK — TXK
yozuvlaridagi davomiylik; T_bekor — mexanik chaqiruvi ochilgan va yopilgan vaqt oralig'idagi ish
smenasi soatlari (smena 10 soat/kun, sozlanadi).

### 4.7 Simulyator (Monte-Karlo)
Kirish: traktorlar soni N, mavsum kunlari D, kunlik ish soati diapazoni, ish turlari ulushi,
yetkazish muddati L, TXK davomiyligi, xarajatlar (TXK, ta'mir, bekor turish soati), yeyilish
parametrlari, β, takrorlar soni R, seed.

Model (kunlik qadam):
- Har kuni har traktor uchun ish soati va ish turi tasodifiy tanlanadi.
- Yeyilish oxirgi TXK dan beri: `dW = t · K^β`. β = 0 — yuklanish yeyilishga ta'sir qilmaydi;
  β = 1 — to'liq keltirilgan soatga proporsional.
- Nosozlik ehtimoli kunlik: `p = 1 − exp(−λ₀ · t · (1 + a · max(0, W/H − 1)²))`; nosozlikda traktor
  ta'mirda `D_rep` kun turadi.
- **S1:** TXK fizik soat bo'yicha; qismlar TXK muddati kelganda buyurtma qilinadi, kelguncha traktor
  ishlashda davom etadi (TXK kechikadi, yeyilish o'sadi).
- **S2:** TXK 4.3 qoidasi bo'yicha; qismlar 4.5 qoidasi bo'yicha oldindan buyurtma qilinadi.
- Ikkala strategiya bir xil tasodifiy ketma-ketlikda ishlaydi (umumiy tasodifiy sonlar).

Chiqish: har bir strategiya uchun K_tt, nosozliklar, TXK soni, bekor soat, jami xarajat — R takror
bo'yicha o'rtacha va 95% ishonch oralig'i. **Sezgirlik:** β ∈ {0, 0.25, 0.5, 0.75, 1} bo'yicha S2 − S1
xarajat farqi grafigi. Ekranda ogohlantirish: "Natijalar imitatsion model natijalari; real
ma'lumot bilan tasdiqlanishi kerak."

PRNG — seed bilan (mulberry32); bir xil seed → bir xil natija (testda).

## 5. Ekranlar va oqim

**Moto-soat kiritish oqimi** (`lib/services/recordMotoReading`):
1. Hisoblagich ko'rsatkichi, sana, ish taqsimoti, ixtiyoriy yoqilg'i va izoh kiritiladi.
2. Tekshiruv: ko'rsatkich oldingisidan kichik → rad; kunlik soat > 24 → ogohlantirish (tasdiqlash
   bilan o'tadi); taqsimot yig'indisi ≠ t → rad.
3. Yozuv saqlanadi → yadro: T_ekv, darajalar holati, prognoz → yangi eslatmalar (takrorlanmasdan) →
   buyurtma nuqtasi tekshiruvi.

**TXK yozuvi:** daraja tanlanadi (tavsiya etilgani oldindan tanlangan), ishlatilgan qismlar,
davomiylik, izoh, rasm → qamralgan darajalar hisoblagichlari nolga qaytadi.

**Ekranlar ro'yxati**

| Ekran | Holat |
|-------|-------|
| Foydalanuvchi tanlash (PIN) | yangi (login/register o'rniga) |
| Bosh sahifa: traktor kartochkalari (fizik/keltirilgan soat, keyingi TXK, sana) | qayta ishlanadi |
| Traktor qo'shish / tafsilotlari | qayta ishlanadi |
| Moto-soat kiritish | qayta ishlanadi (4.2) |
| TXK yozuvi va tarixi | qayta ishlanadi |
| Ehtiyot qism so'rovi, tarixi, admin | omborga o'tkaziladi |
| Mexanik chaqirish va so'rovlar | omborga o'tkaziladi |
| Shikast hisoboti | omborga o'tkaziladi |
| Eslatmalar | qayta ishlanadi |
| Hisobotlar: K_tt, fizik vs keltirilgan soat, muddati o'tgan TXK, qism sarfi, operator faoliyati | qayta ishlanadi + yangi |
| Simulyator | yangi |
| Reglament va ish turlari (admin) | yangi |
| Zaxira: JSON eksport/import, CSV | yangi |
| Profil | soddalashtiriladi |

## 6. Xatolarni boshqarish
- Ombor yozuvi muvaffaqiyatsiz → o'zbekcha xabar, ma'lumot o'zgarmaydi.
- Import: JSON tuzilishi va `schemaVersion` tekshiriladi; xato bo'lsa mavjud ma'lumotga tegilmaydi;
  muvaffaqiyatli importdan oldin joriy holatning avtomatik zaxirasi olinadi.
- O'qishda buzilgan JSON → ilova yiqilmaydi, "zaxiradan tiklash" ekrani ko'rsatiladi.
- Simulyatorda noto'g'ri parametr (N ≤ 0, R > 1000 va h.k.) → maydon ostida xato, ishga tushmaydi.

## 7. Testlar va tekshiruv
- `jest-expo`; `lib/core` uchun unit-testlar: K hisoblash va cheklash, T_ekv, uch shartli muddat,
  ierarxik qamrash, obkatka bir martaligi, davriylik (1250/1500 …), matn misollari (245→5, 180→70),
  prognoz, buyurtma nuqtasi, K_tt, simulyator determinizmi va β=0 da S1/S2 TXK soni munosabati.
- `lib/db` testlari: CRUD, migratsiya, eksport→import aylanmasi, buzilgan import rad etilishi.
- Har bosqichda `tsc --noEmit`.
- Qo'lda: veb-ko'rinishda asosiy oqimlar; oxirida EAS bilan APK, telefonda tutun-test (smoke test).

## 8. Doiradan tashqari
- Server, sinxronlash, push-bildirishnomalar, ko'p qurilmali ish.
- Weibull/ishonchlilik bo'yicha optimallash (real nosozlik ma'lumoti kerak).
- iOS yig'ish.
- Dissertatsiya matni.

## 9. Ochiq masalalar
- Yoqilg'i sarfi jadvalini nomzod manbalar bilan tasdiqlashi kerak.
- Expo hisobi APK yig'ish bosqichida kerak bo'ladi.
