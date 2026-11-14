// حسابات داخل الذاكرة للاختبارات فقط (بديل خدمة الدخول الحقيقية).

import { checkCredentials, cleanEmail, type Account, type Profile } from './account';

export function createMemoryAccount(): Account {
  const users = new Map<string, { password: string; profile: Profile }>();
  let current: string | null = null;

  return {
    signIn: async (email, password) => {
      const invalid = checkCredentials(email, password);
      if (invalid) return { ok: false, error: invalid };
      const user = users.get(cleanEmail(email));
      if (!user || user.password !== password) return { ok: false, error: 'wrongLogin' };
      current = cleanEmail(email);
      return { ok: true, email: current, profile: user.profile };
    },
    signUp: async (email, password, profile) => {
      const invalid = checkCredentials(email, password);
      if (invalid) return { ok: false, error: invalid };
      const key = cleanEmail(email);
      if (users.has(key)) return { ok: false, error: 'emailTaken' };
      users.set(key, { password, profile });
      current = key;
      return { ok: true, email: key, profile };
    },
    signOut: async () => {
      current = null;
    },
    saveProfile: async (profile) => {
      const user = current === null ? undefined : users.get(current);
      if (current !== null && user) users.set(current, { ...user, profile });
    },
  };
}
