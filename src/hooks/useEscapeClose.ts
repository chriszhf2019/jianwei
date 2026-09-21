import { useEffect } from 'react';

/**
 * 模态框通用键盘行为：打开期间按 Esc 调用 onClose。
 * 必须在组件内无条件调用（放在任何条件 return 之前）。
 */
export function useEscapeClose(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);
}
