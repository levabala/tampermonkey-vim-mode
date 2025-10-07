/**
 * TaskManager - General-purpose 60fps-aware async task scheduler
 *
 * Maintains 60fps (16ms per frame) by processing tasks incrementally.
 * Processes tasks until frame budget exhausted, then continues next frame.
 * Can be used for any async updates that need frame-budget awareness.
 */

export interface Task {
    priority: number; // Higher = more urgent
    execute: () => void;
}

const FRAME_BUDGET_MS = 16; // 60fps target

export class TaskManager {
    private taskQueue: Task[] = [];
    private isProcessing = false;
    private rafId: number | null = null;

    /**
     * Schedule a task for execution
     * @param task Task to execute
     */
    scheduleTask(task: Task): void {
        // Insert task in priority order (highest priority first)
        const insertIndex = this.taskQueue.findIndex(
            (t) => t.priority < task.priority,
        );
        if (insertIndex === -1) {
            this.taskQueue.push(task);
        } else {
            this.taskQueue.splice(insertIndex, 0, task);
        }

        // Start processing if not already running
        if (!this.isProcessing) {
            this.startProcessing();
        }
    }

    /**
     * Clear all pending tasks
     */
    clear(): void {
        this.taskQueue = [];
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.isProcessing = false;
    }

    /**
     * Get count of pending tasks
     */
    getPendingCount(): number {
        return this.taskQueue.length;
    }

    private startProcessing(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.processTasksInFrame();
    }

    private processTasksInFrame(): void {
        const frameStartTime = performance.now();

        // Process tasks until frame budget exhausted or queue empty
        while (this.taskQueue.length > 0) {
            const elapsed = performance.now() - frameStartTime;
            if (elapsed >= FRAME_BUDGET_MS) {
                // Frame budget exhausted, schedule next frame
                this.rafId = requestAnimationFrame(() =>
                    this.processTasksInFrame(),
                );
                return;
            }

            // Execute highest priority task
            const task = this.taskQueue.shift()!;
            try {
                task.execute();
            } catch (error) {
                console.error("TaskManager: task execution failed", error);
            }
        }

        // All tasks completed
        this.isProcessing = false;
        this.rafId = null;
    }
}
