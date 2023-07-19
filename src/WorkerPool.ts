import type { IWorkerPool, IWorkerPoolKey } from './abstraction.js'

export class WorkerPool implements IWorkerPool {
    constructor(private readonly _key: IWorkerPoolKey) {}

    queue<C extends (...args: any[]) => any>(callback: C, ...args: Parameters<C>): Promise<ReturnType<C>> {
        return this._key.queue(callback, ...args)
    }
}
