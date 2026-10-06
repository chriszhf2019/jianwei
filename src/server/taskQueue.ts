import crypto from 'node:crypto';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AsyncTask<T = any> {
  id: string;
  type: string;
  status: TaskStatus;
  progress: number; // 0 - 100
  message?: string;
  result?: T;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/** 轻量内存与持久化兼容的异步长任务队列管理器 */
class AsyncTaskQueue {
  private tasks = new Map<string, AsyncTask>();
  private readonly maxTasks = 200;

  createTask<T = any>(type: string, initialMessage = '任务已进入执行队列'): AsyncTask<T> {
    const id = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    const task: AsyncTask<T> = {
      id,
      type,
      status: 'pending',
      progress: 0,
      message: initialMessage,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);

    // 淘汰超出上限的最早任务记录
    if (this.tasks.size > this.maxTasks) {
      const oldestKey = this.tasks.keys().next().value;
      if (oldestKey) this.tasks.delete(oldestKey);
    }
    return task;
  }

  updateProgress(id: string, progress: number, message?: string): AsyncTask | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.status = 'running';
    task.progress = Math.max(0, Math.min(100, Math.round(progress)));
    if (message) task.message = message;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  completeTask<T = any>(id: string, result?: T, message = '任务已成功完成'): AsyncTask<T> | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.status = 'completed';
    task.progress = 100;
    task.message = message;
    task.result = result;
    task.updatedAt = new Date().toISOString();
    return task as AsyncTask<T>;
  }

  failTask(id: string, error: string): AsyncTask | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.status = 'failed';
    task.error = error;
    task.message = `任务执行失败: ${error}`;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  getTask(id: string): AsyncTask | null {
    return this.tasks.get(id) || null;
  }

  listTasks(limit = 30): AsyncTask[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }
}

export const taskQueue = new AsyncTaskQueue();
