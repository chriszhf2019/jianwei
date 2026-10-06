/**
 * 演示语料开关：仅显式 `JIANWEI_ENABLE_DEMO_DATA=1` 才开启。
 * 空值、未设置、其它任意值均视为关闭（默认零演示）。
 */
export function isDemoDataEnabled(
  value: string | undefined = process.env.JIANWEI_ENABLE_DEMO_DATA
): boolean {
  return value === "1";
}
