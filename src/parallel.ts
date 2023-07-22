import { Observable, OperatorFunction } from 'rxjs'
import { IWorkerPool } from './abstraction.js'

export function parallel<T, U>(
    callback: (arg: T) => U | PromiseLike<U>,
    pool: IWorkerPool
): OperatorFunction<T, U> {
    return source => new Observable(target => {
        let busyPortCount = 0
        let isCompleted = false

        source.subscribe({
            next: arg => {
                busyPortCount++
                const item = pool.queue(callback, arg)
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
