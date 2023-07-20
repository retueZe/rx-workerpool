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
    setDesiredWorkerType(type: WorkerType | null): this
}
/** @since v1.0.0 */
export interface IWorkerPool {
    /**
     * Returns `true` if `abort` method of the key of this worker pool was called.
     * @since v1.0.0
     */
    readonly isAbortRequested: boolean

    /**
     * The {@link callback} is serialized by non-standard function serializer, the {@link args} are serialized by default. The {@link callback} cannot be a lambda.
     * @since v1.0.0
     */
    queue<C extends (...args: any[]) => any>(
        callback: C,
        ...args: Parameters<C>
    ): Promise<ReturnType<C>>
}
/** @since v1.0.0 */
export type WorkerType =
    | 'web-worker'
    | 'worker-thread'
