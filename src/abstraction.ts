/** @since v1.0.0 */
export interface IWorkerPoolKey extends IWorkerPool {
    /** @since v1.0.0 */
    readonly pool: IWorkerPool
    /**
     * Returns `true` if abort process was finished.
     * @since v1.0.0
     */
    readonly isAborted: boolean
    /** @since v1.0.0 */
    minWorkerCount: number
    /** @since v1.0.0 */
    maxWorkerCount: number | null

    /**
     * After calling this method, the methods {@link setDesiredWorkerType} and {@link IWorkerPool.queue} no more may be called. Promise resolves once all the busy workers resolve. Obviously, worker count restructions also may not be changed.
     * @since v1.0.0
     */
    abort(): Promise<void>
    /**
     * Specifies what type of workers will be produced by the {@link IWorkerPool.queue} method when there are no cached workers. Already created workers are not affected.
     * @since v1.0.0
     */
    setDesiredWorkerType(type: WorkerType | null): void
    /** @since v1.0.0 */
    setLifetime(lifetime: IWorkerLifetime | null): void
}
/** @since v1.0.0 */
export interface IWorkerPool {
    /**
     * Returns `true` if `abort` method of the key of this worker pool was called.
     * @since v1.0.0
     */
    readonly isAbortRequested: boolean

    /**
     * The {@link callback} is serialized by non-standard function serializer, the {@link args} are serialized by default.
     * @since v1.0.0
     */
    queue<A extends any[], R>(callback: WorkerPoolCallback<A, R>, ...args: A): IWorkerPoolItem<R>
}
/** @since v1.0.0 */
export type WorkerPoolCallback<A extends any[], R> = (...args: A) => R | PromiseLike<R>
/** @since v1.0.0 */
export type WorkerType =
    | 'web-worker'
    | 'worker-thread'
/** @since v1.0.0 */
export interface IWorkerPoolItem<T> extends Promise<T> {
    /** @since v1.0.0 */
    cancel(): void
}
/** @since v1.0.0 */
export interface IWorkerLifetime {
    /**
     * Specifies number of workers into the account. If during a setter call {@link count} didn't change, then affect all the async operations as {@link count} actually did change, but do not call {@link onExpired}.
     * @since v1.0.0
     */
    count: number
    /**
     * Expiration mechanism should only work when this property is set, otherwise no extra async opearations should be performed.
     * @since v1.0.0
     */
    onExpired: ((count: number) => void) | null
}
