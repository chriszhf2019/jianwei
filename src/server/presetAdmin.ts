/** 预设引导管理员（可用环境变量覆盖）。开启鉴权后首次启动种子写入。 */
export const PRESET_ADMIN_USER = String(process.env.JIANWEI_ADMIN_USER || "18611010281@163.com").trim();
export const PRESET_ADMIN_PASSWORD = String(process.env.JIANWEI_ADMIN_PASSWORD || "123456");
