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

اللعب ضد البوتات يشتغل بدون أي إعداد. اللعب أونلاين بغرفة خاصة يحتاج مشروع Supabase:

1. أنشئ مشروع في Supabase بحسابك.
2. فعّل الدخول كضيف: Authentication > Sign In / Providers > Anonymous sign-ins.
3. شغّل ملف `supabase/migrations/0001_init.sql` من SQL Editor (أو `supabase db push`).
4. احزم كود الخادم وانشر الدالة:

```bash
npm run build:server
supabase functions deploy room
```

5. انسخ `.env.example` باسم `.env` وعبّ رابط المشروع والمفتاح العام (anon).
6. أعد تشغيل `npm start`.

الخادم هو الحكم: كل حركة تتحقق بنفس محرك القوانين داخل الدالة، وكل لاعب يستلم يده فقط.

**حالة الاختبار:** منطق الغرفة والحكم (`src/net/room.ts`) مختبر بالكامل بدون شبكة. ملفات Supabase نفسها (`supabase/` و `src/net/supabaseTransport.ts`) ما انختبرت على مشروع حقيقي بعد.

## الأسرار

المفاتيح السرية تنحط في `.env` فقط، وهو مضاف إلى `.gitignore`.
