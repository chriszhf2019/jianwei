import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

type InitialValue<T> = T | (() => T);

export interface UseLocalStateOptions {
  /** 存储 schema 版本；升级后旧数据自动作废，回落到初始值 */
  version?: number;
  /**
   * 旧版无前缀/不同 key 的历史数据（首次读取后自动迁移到新 key 并删除旧 key）。
   * 例：早期直连保存的 'jianwei-action-memo' → 新 key 'action-memo'
   */
  legacyKey?: string;
}

const STORAGE_PREFIX = 'jianwei';

/**
 * 通用 localStorage 持久化 state：
 *  - 用法与 useState 一致（返回 [value, setValue]）；
 *  - 数据变更自动写入 localStorage（key 统一加 'jianwei:' 前缀）；
 *  - 指定 version 时按 { v, d } 包装存储，version 不匹配则忽略旧数据；
 *  - 存储不可用（隐私模式/禁用）时静默降级为会话内状态。
 */
export function useLocalState<T>(
  key: string,
  initial: InitialValue<T>,
  options: UseLocalStateOptions = {}
): [T, Dispatch<SetStateAction<T>>] {
  const fullKey = `${STORAGE_PREFIX}:${key}`;

  const [value, setValue] = useState<T>(() => {
    const readRaw = (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };

    const parse = (raw: string | null): unknown => {
      if (raw == null) return undefined;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return undefined;
      }
    };

    try {
      let parsed = parse(readRaw(fullKey));
      // 旧 key 一次性迁移：读到即写入新 key（由下方 effect 落盘）并删除旧 key
      if (parsed === undefined && options.legacyKey != null) {
        const legacy = parse(readRaw(options.legacyKey));
        if (legacy !== undefined) {
          parsed = legacy;
          try {
            localStorage.removeItem(options.legacyKey);
          } catch {
            /* 忽略删除失败 */
          }
        }
      }

      if (parsed !== undefined) {
        if (options.version != null && typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          const boxed = parsed as { v?: unknown; d?: unknown };
          if (boxed.v !== undefined) {
            if (boxed.v !== options.version) throw new Error('version mismatch');
            return boxed.d as T;
          }
          // 无版本包装的旧对象数据（如旧版保存的普通对象）直接使用
          return parsed as T;
        }
        return parsed as T;
      }
    } catch {
      /* 损坏 / 版本不符：回落到初始值 */
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      const payload =
        options.version != null
          ? JSON.stringify({ v: options.version, d: value })
          : JSON.stringify(value);
      localStorage.setItem(fullKey, payload);
    } catch {
      /* 存储不可用时静默降级 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey, value, options.version]);

  return [value, setValue];
}
