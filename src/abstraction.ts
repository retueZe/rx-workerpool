/** @since v1.0.0 */
export interface IWorkerPoolKey extends IWorkerPool {
    /** @since v1.0.0 */
    readonly pool: IWorkerPool
    /** @since v1.0.0 */
    readonly isAborted: boolean
    /** @since v1.0.0 */
    minWorkerCount: number
    /** @since v1.0.0 */
    maxWorkerCount: number | null

    /** @since v1.0.0 */
    abort(): Promise<void>
    /** @since v1.0.0 */
    setDesiredWorkerType(type: WorkerType | null): this
}
/** @since v1.0.0 */
export interface IWorkerPool {
    /** @since v1.0.0 */
    readonly isAbortRequested: boolean

    /** @since v1.0.0 */
    queue<C extends (...args: any[]) => any>(
        callback: C,
        ...args: Parameters<C>
    ): Promise<ReturnType<C>>
}
/** @since v1.0.0 */
export type WorkerType =
    | 'web-worker'
    | 'worker-thread'
