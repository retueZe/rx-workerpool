import { SchedulerAction, SchedulerLike, Subscription } from 'rxjs'
import type { IWorkerPool, IWorkerPoolItem } from './abstraction.js'
import { deserializeFunction, serializeFunction } from './serialization.js'

/** @since v1.0.0 */
export const WorkerPoolScheduler: WorkerPoolSchedulerConstructor = class WorkerPoolScheduler implements SchedulerLike {
    constructor(private readonly _pool: IWorkerPool) {}

    schedule<T>(work: (this: SchedulerAction<T>, state: T) => void, delay: number, state: T): Subscription
    schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay?: number, state?: T): Subscription
    schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay?: number, state?: T): Subscription {
        return new WorkerPoolSchedulerAction(this._pool, work).schedule(state, delay)
    }
    now(): number {
        return Date.now()
    }
}
type WorkerPoolSchedulerConstructor = {
    /** @since v1.0.0 */
    new(pool: IWorkerPool): SchedulerLike
}
class WorkerPoolSchedulerAction<T> extends Subscription implements SchedulerAction<T> {
    private readonly _serializedWork: string
    private _item: IWorkerPoolItem<any> | null = null
    private _timeout: NodeJS.Timeout | null = null

    constructor(
        private readonly _pool: IWorkerPool,
        work: (this: SchedulerAction<T>, state?: T) => void
    ) {
        super(() => this._teardownLogic())

        this._serializedWork = serializeFunction(work)
    }

    private _teardownLogic(): void {
        if (this._item !== null) {
            this._item.cancel()
            this._item.catch(() => {})
            this._item = null
        }
        if (this._timeout !== null) {
            clearTimeout(this._timeout)
            this._timeout = null
        }
    }
    private _scheduleCore(state: T | undefined): void {
        // MAYBE: remove?
        if (this.closed) return

        this._item = this._pool.queue(_queueCallback, this._serializedWork, state)
    }
    schedule(state?: T, delay?: number): Subscription {
        if (this.closed) return this

        this._teardownLogic()
        delay = Math.floor(delay ?? 0)

        if (delay < -0.5) throw new RangeError('Negative delay.')
        if (delay < 0.5)
            this._scheduleCore(state)
        else
            this._timeout = setTimeout(this._scheduleCore.bind(this, state), delay)

        return this
    }
}

// TODO: add dedicated scheduler implementation
// TODO: work: (this: SchedulerAction<T>, state: T) => void
// TODO:        ~~~~~~~~~~~~~~~~~~~~~~~~
function _queueCallback(_work: string, state: any): void {
    const work = deserializeFunction(_work)

    work(state)
}
