-- DEAL Q8 — المرحلة 9: اللعب أونلاين العشوائي
-- أعمدة مساعدة على جدول الغرف عشان الخادم يلقى غرفة عشوائية مفتوحة،
-- ويعرف إذا اللاعب داخل غرفة ما انتهت (لاعب ما يدخل مباراتين بنفس الوقت).
-- الجدول يبقى مقفول على التطبيق (RLS بدون سياسات): الخادم فقط يقرأ ويكتب.

alter table public.rooms
  add column if not exists status text not null default 'lobby',
  add column if not exists matchmaking boolean not null default false,
  add column if not exists seat_count integer not null default 0,
  add column if not exists player_ids uuid[] not null default '{}';

-- البحث عن غرفة عشوائية مفتوحة (الأقدم أولاً).
create index if not exists rooms_open_match_idx
  on public.rooms (updated_at)
  where matchmaking and status = 'lobby';

-- البحث عن غرفة اللاعب الحالية.
create index if not exists rooms_player_ids_idx
  on public.rooms using gin (player_ids);
