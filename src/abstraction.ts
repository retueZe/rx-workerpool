export interface IWorkerPoolKey extends IWorkerPool {
    readonly worker: IWorkerPool
    readonly workerType: WorkerType
    minWorkerCount: number
    maxWorkerCount: number | null
}
export interface IWorkerPool {
    queue<C extends (...args: any[]) => any>(
        callback: C,
        transfer: Transferable[],
        ...args: Parameters<C>
    ): Promise<ReturnType<C>>
}
export type WorkerType =
    | 'web-worker'
    | 'worker-thread'
    | 'process'
