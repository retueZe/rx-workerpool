import type { IWorkerPool, IWorkerPoolItem, IWorkerPoolKey, WorkerPoolCallback } from './abstraction.js'

/** @since v1.0.0 */
export const WorkerPool: WorkerPoolConstructor = class WorkerPool implements IWorkerPool {
    get isAbortRequested(): boolean {
        return this._key.isAbortRequested
    }

    constructor(private readonly _key: IWorkerPoolKey) {}

    queue<A extends any[], R>(callback: WorkerPoolCallback<A, R>, ...args: A): IWorkerPoolItem<R> {
        return this._key.queue(callback, ...args)
    }
}
type WorkerPoolConstructor = {
    /** @since v1.0.0 */
    new(key: IWorkerPoolKey): IWorkerPool
}
