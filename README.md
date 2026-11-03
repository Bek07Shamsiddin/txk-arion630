# TXK Arion-630

Claas Arion-630 traktorlariga texnik xizmat ko'rsatish (TXK) uchun to'liq oflayn Android ilova
(Expo SDK 54, React Native). Ma'lumot faqat qurilmada saqlanadi; server va internet kerak emas.
Ilova PhD ishidagi **moslashuvchan TXK davriyligi usuli**ni amalda ko'rsatadi.

## 0. Tez ishga tushirish (Windows, VS Code)

Talab: [Node.js](https://nodejs.org) 20 yoki undan yangi (LTS) va VS Code.

**Eng oson yo‘l:** papkadagi `ishga-tushirish.bat` faylini ikki marta bosing. U birinchi marta paketlarni o‘rnatadi (1–2 daqiqa) va ilovani brauzerda ochadi.

**VS Code orqali:**

> PowerShell’da *“running scripts is disabled”* xatosi chiqsa: `npm` o‘rniga `npm.cmd` yozing (masalan `npm.cmd install`) yoki terminalni **Command Prompt** ga almashtiring (loyiha sozlamasida standart qilib qo‘yilgan).

1. VS Code → *File → Open Folder…* → `TXK_Arion630` papkasini oching.
2. Terminal oching (*Terminal → New Terminal*) va bir marta:
   ```
   npm install
   ```
3. Ilovani brauzerda ochish:
   ```
   npm run web
   ```
   Brauzer o‘zi ochilmasa: http://localhost:8081
4. Telefonda sinash (ixtiyoriy): telefonga **Expo Go** ilovasini o‘rnating, kompyuter va telefon bitta Wi‑Fi tarmog‘ida bo‘lsin, so‘ng `npm start` va terminaldagi QR kodni Expo Go bilan skanerlang.
5. To‘xtatish: terminalda `Ctrl + C`.

VS Code’da tayyor vazifalar ham bor: *Terminal → Run Task…* → “1. Paketlarni o‘rnatish”, “2. Ilovani brauzerda ochish”, “4. Testlar”.

Foydalanuvchilar ( PIN oson va bir martalik — kirgach admin “Foydalanuvchilar” ekranida almashtiradi):

| Foydalanuvchi | Rol | PIN |
|---|---|---|
| Ilxomjon Xolmirzayev — asosiy muallif, bosh dasturchi (+998 99 977 7555) | Administrator | 1111 |
| Inomjonov Mansurbek | Texnik (mexanik) | 2222 |
| Yodgoraliyev Nozimjon | Texnik (mexanik) | 3333 |
| Rahmatov Islomjon | Texnik (mexanik) | 4444 |
| Ulug'bek (+998 90 693 53 50) | Operator | 5555 |
| Adhamjon (+998 91 178 31 01) | Operator | 6666 |
| Islomjon (+998 99 977 55 25) | Operator | 7777 |
| Akrombek (+998 90 215 31 91) | Operator | 8888 |

Ilova ochiq turganda traktorlar real vaqtda ishlaydi: har 5 soniyada 1 ish soati (kunduzi 06–20), ogohlantirishlar ovoz va ekran chetidagi rangli signal bilan chiqadi.

Namunaviy traktorlar: Mingbuloq tumani, Claas Arion 630/630C — A2003495, A2003707, A2004017, A2004100. Ma’lumotlar brauzer/telefon xotirasida saqlanadi; tozalash uchun brauzerda sayt ma’lumotlarini o‘chiring.

## 1. Ilova haqida

Ilmiy yadro:

- **Keltirilgan moto-soat:** `T_ekv = Σ tᵢ · Kᵢ`, bunda `Kᵢ = Gᵢ / G_nom` (ish turi yoqilg'i
  sarfining nominal sarfga nisbati; K [0.2; 2.0] oralig'ida cheklanadi).
- **Moslashuvchan TXK muddati:** daraja muddati kelgan hisoblanadi, agar quyidagilardan *qaysi biri
  birinchi* bajarilsa: `T_ekv ≥ H`, `T_fiz ≥ γ·H` yoki oxirgi TXK dan 12 oy o'tdi.
  Reglament ierarxik (TXK-1/2/3 davriy, 50 va 100 soatlik obkatka bir martalik).
- **Prognoz** (keyingi TXK sanasi) va ehtiyot qismlar **buyurtma nuqtasi**.
- **Texnik tayyorlik koeffitsienti** `K_tt = T_ish / (T_ish + T_TXK + T_bekor)`.
- **Simulyator** (Monte-Karlo): S1 (fizik soat bo'yicha TXK) va S2 (moslashuvchan TXK)
  strategiyalarini taqqoslaydi; β bo'yicha sezgirlik grafigi bor.

## 2. Rollar va ish oqimi

| Rol | Imkoniyatlari |
|-----|---------------|
| Operator | traktor qo'shish, moto-soat kiritish, ehtiyot qism so'rovi, mexanik chaqirish, shikast hisoboti, TXK tarixini ko'rish |
| Texnik (mexanik) | TXK yozuvi qo'shish va oxirgisini o'chirish, mexanik so'rovlarni bajarish, ehtiyot qism so'rovi, hisobotlarni ko'rish, TXK tarixini ko'rish |
| Admin | barcha amallar: foydalanuvchilar, reglament va ish turlari, ehtiyot qism so'rovlari holatini boshqarish (faqat admin), traktorni tahrirlash/o'chirish, hisobotlar, **zaxira (faqat admin)** |

Foydalanuvchi ilova ochilganda ro'yxatdan tanlanadi (ixtiyoriy 4 xonali PIN). Bu xavfsizlik emas,
"kim kiritdi" ni qayd etish vositasi.

Asosiy oqim: **traktor qo'shish → moto-soat (hisoblagich ko'rsatkichi) → eslatma → ehtiyot qism
buyurtma → TXK yozuvi → hisobotlar**.

## 3. Muhim ogohlantirishlar

- **Yoqilg'i sarfi jadvali taxminiy ("tasdiqlanmagan").** Ish turlari bo'yicha boshlang'ich G
  qiymatlari adabiyot bilan tekshirilmagan. Admin ularni adabiyotdan tasdiqlab, *Reglament*
  ekranida tahrirlashi shart; shundan keyingina keltirilgan soat ishonchli bo'ladi. K qiymatlari
  (ish turi yoqilg'i sarfi yoki nominal sarf) o'zgartirilsa, mavjud moto-soat yozuvlarining
  keltirilgan soati avtomatik qayta hisoblanadi.
- **Simulyator parametrlari (λ₀, a, xarajatlar va h.k.) vaqtincha qiymatlar.** Natijalar ularga
  bog'liq. Boshlang'ich parametrlarda moslashuvchan strategiya (S2) arzonroq **emas**.
- Natijalar **imitatsion model natijalari**, dala (real) ma'lumoti emas; real ma'lumot bilan
  tasdiqlanishi kerak.

## 4. Zaxira tartibi

Ma'lumot faqat shu qurilmada turadi, shuning uchun **zaxirani muntazam oling**.

- **Eksport:** *Zaxira nusxa* ekranidan JSON fayl olinadi va ulashiladi (xavfsiz joyga saqlang).
- **Import:** JSON fayl tanlanadi; tuzilishi va `schemaVersion` tekshiriladi, xato bo'lsa mavjud
  ma'lumotga tegilmaydi.
- **Avtomatik zaxira:** har bir importdan oldin joriy holat avtomatik saqlanadi; kerak bo'lsa
  "Avtomatik zaxiradan qaytarish" bilan tiklanadi.

## 5. Ishlab chiquvchi uchun

```bash
npm install
npm test                  # jest (yadro, ombor, servislar)
npx tsc --noEmit          # tur tekshiruvi
npx expo start --web      # veb-ko'rinishda ishga tushirish
npx expo export --platform web   # veb yig'ish
```

Kod tuzilishi: `app/` ekranlar, `lib/core/` ilmiy yadro (sof funksiyalar), `lib/db/` mahalliy
ombor, `lib/services/` amallar, `lib/i18n/` o'zbekcha matnlar.

## 6. APK yig'ish (Android)

1. Bepul Expo hisobini oching: <https://expo.dev>.
2. Kiring: `npx eas-cli login`.
3. APK yig'ing: `npx eas-cli build -p android --profile preview`.
4. Yig'ish tugagach berilgan havoladan APK ni yuklab oling.
5. Telefonda APK ni oching va o'rnating (so'ralsa, "noma'lum manbalardan o'rnatish" ga ruxsat bering).
