import { Observable, OperatorFunction } from 'rxjs'
import { IWorkerPool } from '../abstraction.js'
import { getSharedWorkerPool } from '../shared-worker-pool.js'

// TODO: add `ordered` option
/**
 * An analogue of RxJS `map` operator. If the source observable has been completed, and there are still busy workers, the target observer completes once the last busy observer finishes computations. If one of workers has been failed, then the target observer fails immediately.
 * @since v1.0.0
 */
export function mapParallel<T, U>(
    callback: (value: T) => U | PromiseLike<U>,
    _pool?: IWorkerPool | null
): OperatorFunction<T, U> {
    const pool = _pool ?? getSharedWorkerPool()

    return source => new Observable(target => {
        let busyPortCount = 0
        let isCompleted = false

        source.subscribe({
            next: value => {
                busyPortCount++
                const item = pool.queue(callback, value)
                item.then(result => {
                    busyPortCount--
                    target.next(result)

                    if (isCompleted && busyPortCount < 0.5)
                        target.complete()
                }, error => {
                    busyPortCount--
                    isCompleted = true
                    target.error(error)
                })
            },
            error: error => {
                isCompleted = true
                target.error(error)
            },
            complete: () => isCompleted = true
        })
    })
}
