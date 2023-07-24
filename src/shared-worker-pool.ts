import type { IWorkerPool } from './abstraction.js'

let SHARED_WORKER_POOL: IWorkerPool | null = null

/** @since v1.0.0 */
export function getSharedWorkerPool(): IWorkerPool {
    if (SHARED_WORKER_POOL === null) throw new Error('Shared worker pool is not present.')

    return SHARED_WORKER_POOL
}
/** @since v1.0.0 */
export function setSharedWorkerPool(pool: IWorkerPool): void {
    SHARED_WORKER_POOL = pool
}
