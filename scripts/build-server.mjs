// يحزم منطق الغرفة والمحرك بملف واحد لدالة Supabase (Deno ما يقبل الاستيراد بدون امتداد).
// التشغيل: npm run build:server  ثم  supabase functions deploy room
import { build } from 'esbuild';

await build({
  entryPoints: ['src/net/server.ts'],
  outfile: 'supabase/functions/_shared/game.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  legalComments: 'none',
});
console.log('built supabase/functions/_shared/game.js');
