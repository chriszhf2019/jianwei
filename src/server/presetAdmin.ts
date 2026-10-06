import { passwordPolicyError } from "./database/users";

/**
 * 预设引导管理员：无写死默认值。
 * 仅当环境变量 JIANWEI_ADMIN_USER 与 JIANWEI_ADMIN_PASSWORD 均已设置，
 * 且密码满足服务端规则时，启动流程才会创建管理员。
 */
export const PRESET_ADMIN_USER = String(process.env.JIANWEI_ADMIN_USER || "").trim();
export const PRESET_ADMIN_PASSWORD = String(process.env.JIANWEI_ADMIN_PASSWORD || "");

export type PresetAdminResolution =
  | { ok: true; username: string; password: string }
  | { ok: false; reason: "missing" | "weak_password" };

/** 解析启动时是否应种子写入预设管理员。 */
export function resolvePresetAdmin(): PresetAdminResolution {
  const username = String(process.env.JIANWEI_ADMIN_USER || "").trim();
  const password = String(process.env.JIANWEI_ADMIN_PASSWORD || "");
  if (!username || !password) {
    return { ok: false, reason: "missing" };
  }
  if (passwordPolicyError(password)) {
    return { ok: false, reason: "weak_password" };
  }
  return { ok: true, username, password };
}
