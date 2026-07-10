export const SYSTEM_ADMIN_EMAILS = ['renafly@gmail.com'] as const;
const SYSTEM_ADMIN_EMAIL_SET = new Set<string>(SYSTEM_ADMIN_EMAILS);

export function isSystemAdminEmail(...emails: Array<string | null | undefined>) {
  return emails.some((email) => SYSTEM_ADMIN_EMAIL_SET.has(email?.trim().toLowerCase() ?? ''));
}
