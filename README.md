# DEAL Q8

لعبة كروت للجوال لأربعة لاعبين بثيم خليجي. React Native (Expo) + TypeScript + Supabase.

## الملفات المرجعية

| الملف | وظيفته |
|---|---|
| `prd.md` | القوانين والكروت والميزات |
| `plan.md` | مراحل العمل وشروط العبور |
| `CLAUDE.md` | طريقة العمل |
| `design/` | المرجع البصري للواجهة |

## التشغيل

```bash
npm install
npm start
```

بعدها افتح التطبيق من Expo Go بمسح الكود. التطبيق مقفول على العرض (Landscape).

## الفحوصات

```bash
npm run lint
npx tsc --noEmit
npm test
```

## هيكل المجلدات

- `src/engine` — محرك القوانين
- `src/data` — بيانات الكروت
- `src/bot` — البوت
- `src/ui` — الواجهة
- `src/net` — الاتصال
- `supabase/` — الخادم

## اللعب أونلاين (Supabase)

اللعب ضد البوتات يشتغل بدون أي إعداد. اللعب أونلاين بغرفة خاصة يشتغل على مشروع Supabase اسمه `deal-q8`.

**اللي مجهز:**
- الجداول والصلاحيات (`supabase/migrations/0001_init.sql` و `0002_matchmaking.sql`) مطبقة.
- دالة الخادم `room` منشورة.
- ملف `.env` المحلي فيه رابط المشروع والمفتاح العام (ما ينرفع للمستودع). على جهاز جديد: انسخ `.env.example` باسم `.env` وعبّه من Project Settings > API.

**خطوة يدوية مرة وحدة:** فعّل الدخول كضيف من لوحة Supabase:
Authentication > Sign In / Providers > Anonymous sign-ins.

**تجربة الخادم الفعلية** (غرفة خاصة ومباراة كاملة مع بوتين، ثم اللعب العشوائي):

```bash
node --env-file=.env scripts/online-check.mjs
```

**إذا تغيّر محرك القوانين** لازم الخادم يتحدث معه:
1. `npm run build:server` (يولّد `supabase/functions/_shared/game.js`)، ثم commit ورفع.
2. حدّث رقم الـcommit في رابط الاستيراد داخل `supabase/functions/room/index.ts`.
3. انشر الدالة: `supabase functions deploy room`.

الخادم هو الحكم: كل حركة تتحقق بنفس محرك القوانين داخل الدالة، وكل لاعب يستلم يده فقط.

## الأسرار

المفاتيح السرية تنحط في `.env` فقط، وهو مضاف إلى `.gitignore`.
