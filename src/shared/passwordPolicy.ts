/**
 * 前后端共用的密码规则。
 * 至少 10 位，且在「大写 / 小写 / 数字 / 符号」中至少满足 3 类。
 */

export type PasswordPolicyErrorCode =
  | 'password_too_short'
  | 'password_too_weak';

export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_POLICY_HINT =
  '密码至少 10 位，并包含大写字母、小写字母、数字、符号中的至少三类。';

export function passwordPolicyError(password: string): PasswordPolicyErrorCode | null {
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH) return 'password_too_short';
  let classes = 0;
  if (/[A-Z]/.test(value)) classes += 1;
  if (/[a-z]/.test(value)) classes += 1;
  if (/[0-9]/.test(value)) classes += 1;
  if (/[^A-Za-z0-9]/.test(value)) classes += 1;
  if (classes < 3) return 'password_too_weak';
  return null;
}

/** 面向用户的中文错误说明。 */
export function passwordPolicyErrorMessage(code: PasswordPolicyErrorCode | string | null | undefined): string {
  if (code === 'password_too_short') {
    return `密码过短：至少 ${PASSWORD_MIN_LENGTH} 位。`;
  }
  if (code === 'password_too_weak') {
    return PASSWORD_POLICY_HINT;
  }
  if (!code) return PASSWORD_POLICY_HINT;
  return PASSWORD_POLICY_HINT;
}

export function meetsPasswordPolicy(password: string): boolean {
  return passwordPolicyError(password) === null;
}
