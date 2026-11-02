# TXK Arion-630

Claas Arion-630 traktorlariga texnik xizmat ko'rsatish (TXK) uchun to'liq oflayn Android ilova
(Expo SDK 54, React Native). Ma'lumot faqat qurilmada saqlanadi; server va internet kerak emas.
Ilova PhD ishidagi **moslashuvchan TXK davriyligi usuli**ni amalda ko'rsatadi.

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
| Operator | moto-soat kiritish, ehtiyot qism so'rovi, mexanik chaqirish, shikast hisoboti |
| Texnik (mexanik) | TXK yozuvi, so'rovlarni bajarish, qismlar holati |
| Admin | foydalanuvchilar, reglament va ish turlari, qismlar, zaxira, barcha hisobotlar |

Foydalanuvchi ilova ochilganda ro'yxatdan tanlanadi (ixtiyoriy 4 xonali PIN). Bu xavfsizlik emas,
"kim kiritdi" ni qayd etish vositasi.

Asosiy oqim: **traktor qo'shish → moto-soat (hisoblagich ko'rsatkichi) → eslatma → ehtiyot qism
buyurtma → TXK yozuvi → hisobotlar**.

## 3. Muhim ogohlantirishlar

- **Yoqilg'i sarfi jadvali taxminiy ("tasdiqlanmagan").** Ish turlari bo'yicha boshlang'ich G
  qiymatlari adabiyot bilan tekshirilmagan. Admin ularni adabiyotdan tasdiqlab, *Reglament*
  ekranida tahrirlashi shart; shundan keyingina keltirilgan soat ishonchli bo'ladi.
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
