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

## الأسرار

المفاتيح السرية تنحط في `.env` فقط، وهو مضاف إلى `.gitignore`.
