// فحص الأسرار — plan.md المرحلة 8: "ما فيه مفاتيح سرية داخل المستودع"
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');

function trackedFiles(): string[] {
  return execSync('git ls-files', { cwd: root, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

describe('الأسرار', () => {
  it('ملف .env مو مرفوع، و .env.example قيمه فاضية', () => {
    const files = trackedFiles();
    expect(files).not.toContain('.env');
    expect(files.filter((file) => /^\.env\./.test(file))).toEqual(['.env.example']);

    const example = readFileSync(join(root, '.env.example'), 'utf8');
    const values = example
      .split('\n')
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => line.slice(line.indexOf('=') + 1).trim());
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === '')).toBe(true);
  });

  it('ما فيه مفاتيح أو توكنات مكتوبة داخل ملفات المستودع', () => {
    // توكن JWT (مفاتيح Supabase القديمة)، ومفاتيح Supabase الجديدة السرية.
    const patterns = [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, /sb_secret_[A-Za-z0-9_-]{10,}/];
    const text = /\.(ts|tsx|js|mjs|json|md|sql|html|example)$/;
    const hits: string[] = [];

    for (const file of trackedFiles()) {
      if (!text.test(file) || file === 'package-lock.json') continue;
      const content = readFileSync(join(root, file), 'utf8');
      if (patterns.some((pattern) => pattern.test(content))) hits.push(file);
    }
    expect(hits).toEqual([]);
  });

  it('مفتاح service_role ما ينقرأ إلا داخل دالة الخادم، ومن متغيرات البيئة فقط', () => {
    const users = trackedFiles().filter((file) => {
      if (!/\.(ts|tsx|js|mjs)$/.test(file) || file.endsWith('secrets.test.ts')) return false;
      // اسم متغير البيئة حق المفتاح السري
      return /SERVICE_ROLE_KEY/.test(readFileSync(join(root, file), 'utf8'));
    });
    expect(users).toEqual(['supabase/functions/room/index.ts']);
    const server = readFileSync(join(root, 'supabase/functions/room/index.ts'), 'utf8');
    expect(server).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
  });
});
