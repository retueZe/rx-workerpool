import { map, OperatorFunction, pipe } from 'rxjs'
import { IWorkerPool } from '../abstraction.js'
import { deserializeFunction, serializeFunction } from '../serialization.js'
import { mapParallel } from './mapParallel.js'

// TODO: optimize
/**
 * An analogue of RxJS `tap` operator, implemented via {@link mapParallel}. If {@link callback} returns a `PromiseLike` instance, then it will wait for it until it fulfills.
 * @since v1.0.0
 */
export function tapParallel<T>(callback: (value: T) => any, pool?: IWorkerPool | null): OperatorFunction<T, T> {
    const serializedCallback = serializeFunction(callback)

    return pipe(
        map<T, [T, string]>(value => [value, serializedCallback]),
        mapParallel(async ([value, _callback]) => {
            const callback: (value: T) => any = deserializeFunction(_callback)
            const asyncResult = callback(value)

            if (typeof asyncResult === 'object' && asyncResult !== null &&
                'then' in asyncResult && typeof asyncResult.then === 'function')
                await asyncResult

            return value
        }, pool))
}
