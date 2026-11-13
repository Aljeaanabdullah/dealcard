-- DEAL Q8 — المرحلة 8: اللعب أونلاين بغرفة خاصة
-- الخادم هو الحكم: حالة اللعبة الكاملة (فيها كل الأيدي) ما يقرأها أي تطبيق أبداً.
-- ملاحظة: هذا الملف ما انشغّل على قاعدة بيانات حقيقية بعد.

-- حالة الغرفة الكاملة. RLS مفعّل بدون أي سياسة = ما يوصلها إلا مفتاح service_role (داخل دالة الخادم فقط).
create table if not exists public.rooms (
  code text primary key,
  state jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.rooms enable row level security;

-- لقطة كل لاعب: يده فقط، وأيدي الباقين مخفية. اللاعب يقرأ صفه هو فقط.
create table if not exists public.player_views (
  room_code text not null references public.rooms (code) on delete cascade,
  user_id uuid not null,
  snapshot jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (room_code, user_id)
);
alter table public.player_views enable row level security;

create policy "player reads own view"
  on public.player_views
  for select
  to authenticated
  using (user_id = auth.uid());

-- ما فيه سياسات insert/update/delete: الكتابة من دالة الخادم فقط.

-- التحديث المباشر: كل لاعب يستلم تغييرات صفه.
alter publication supabase_realtime add table public.player_views;
