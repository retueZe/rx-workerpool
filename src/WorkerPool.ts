import type { IWorkerPool, IWorkerPoolKey } from './abstraction.js'

/** @since v1.0.0 */
export const WorkerPool: WorkerPoolConstructor = class WorkerPool implements IWorkerPool {
    get isAbortRequested(): boolean {
        return this._key.isAbortRequested
    }

    constructor(private readonly _key: IWorkerPoolKey) {}

    queue<C extends (...args: any[]) => any>(callback: C, ...args: Parameters<C>): Promise<ReturnType<C>> {
        return this._key.queue(callback, ...args)
    }
}
type WorkerPoolConstructor = {
    new(key: IWorkerPoolKey): IWorkerPool
}
