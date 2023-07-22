import { Observable, OperatorFunction } from 'rxjs'
import { IWorkerPool } from '../abstraction.js'

export function mapParallel<T, U>(
    callback: (value: T) => U | PromiseLike<U>,
    pool: IWorkerPool
): OperatorFunction<T, U> {
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
