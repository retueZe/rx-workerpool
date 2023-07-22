import { Observable, OperatorFunction, Unsubscribable } from 'rxjs'
import { IWorkerPool } from './abstraction.js'

export function parallel<T, U>(
    callback: (arg: T) => U | PromiseLike<U>,
    pool: IWorkerPool
): OperatorFunction<T, U> {
    return source => new Observable(target => {
        let subscription: Unsubscribable | null = null
        subscription = source.subscribe({
            next: arg => {
                subscription?.unsubscribe()
                subscription = null

                const item = pool.queue(callback, arg)
                item.then(
                    result => target.next(result),
                    error => target.error(error))
            },
            error: error => target.error(error)
        })
    })
}
