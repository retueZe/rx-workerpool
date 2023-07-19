export interface IWorkerPoolKey extends IWorkerPool {
    readonly pool: IWorkerPool
    readonly isAborted: boolean
    minWorkerCount: number
    maxWorkerCount: number | null

    abort(): Promise<void>
    setDesiredWorkerType(type: WorkerType | null): this
}
export interface IWorkerPool {
    readonly isAbortRequested: boolean

    queue<C extends (...args: any[]) => any>(
        callback: C,
        ...args: Parameters<C>
    ): Promise<ReturnType<C>>
}
export type WorkerType =
    | 'web-worker'
    | 'worker-thread'
