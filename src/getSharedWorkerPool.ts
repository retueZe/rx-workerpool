import type { IWorkerPool, IWorkerPoolKey } from './abstraction.js'
import { WorkerPoolKey } from './WorkerPoolKey.js'

let SHARED_WORKER_POOL_KEY: IWorkerPoolKey | null = null

/**
 * Returns a global instance of {@link IWorkerPool} interface. The instance is initialized upon the first {@link getSharedWorkerPool} call. To this instance no restrictions are applied and it produces native workers.
 * @since v1.0.0
 */
export function getSharedWorkerPool(): IWorkerPool {
    SHARED_WORKER_POOL_KEY ??= new WorkerPoolKey()

    return SHARED_WORKER_POOL_KEY.pool
}
