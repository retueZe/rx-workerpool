export interface IWorkerPoolKey extends IWorkerPool {
    readonly pool: IWorkerPool
    minWorkerCount: number
    maxWorkerCount: number | null

    // abort(): void
    dispose(): void
    setDesiredWorkerType(type: WorkerType | null): this
}
export interface IWorkerPool {
    queue<C extends (...args: any[]) => any>(
        callback: C,
        ...args: Parameters<C>
    ): Promise<ReturnType<C>>
}
export type WorkerType =
    | 'web-worker'
    | 'worker-thread'
