// حساب اللاعب (اختياري) — prd.md القسم 6
// اللاعب يقدر يلعب كضيف، أو يسجّل بإيميل وكلمة سر عشان اسمه وشخصيته ينحفظون.
// كلمة السر تروح لخدمة الدخول مباشرة: ما تنحفظ بالتطبيق وما تنكتب بأي سجل.

import { normalizeAvatar } from '../data/avatars';

export interface Profile {
  readonly name: string;
  readonly avatar: number;
}

export type AccountError = 'invalidEmail' | 'weakPassword' | 'wrongLogin' | 'emailTaken' | 'confirmEmail' | 'network';

export type AccountResult =
  | { readonly ok: true; readonly email: string; readonly profile: Profile }
  | { readonly ok: false; readonly error: AccountError };

export interface Account {
  signIn(email: string, password: string): Promise<AccountResult>;
  /** حساب جديد، وينحفظ معه الاسم والشخصية الحاليين. */
  signUp(email: string, password: string, profile: Profile): Promise<AccountResult>;
  signOut(): Promise<void>;
  /** يحفظ الاسم والشخصية على الحساب (إذا اللاعب داخل بحساب). */
  saveProfile(profile: Profile): Promise<void>;
}

/** أقل طول لكلمة السر. */
export const MIN_PASSWORD_LENGTH = 6;

export function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** فحص الإيميل وكلمة السر قبل إرسالهم. null = سليم. */
export function checkCredentials(email: string, password: string): AccountError | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(email))) return 'invalidEmail';
  if (password.length < MIN_PASSWORD_LENGTH) return 'weakPassword';
  return null;
}

/** يقرأ الاسم والشخصية من بيانات الحساب المحفوظة، وأي قيمة غلط ترجع للافتراضي. */
export function readProfile(data: unknown): Profile {
  const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  return {
    name: typeof record.name === 'string' ? record.name.trim().slice(0, 16) : '',
    avatar: normalizeAvatar(record.avatar),
  };
}
