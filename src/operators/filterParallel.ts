import { filter, map, OperatorFunction, pipe } from 'rxjs'
import { IWorkerPool } from '../abstraction.js'
import { deserializeFunction, serializeFunction } from '../serialization.js'
import { mapParallel } from './mapParallel.js'

// TODO: optimize
/**
 * An analogue of RxJS `filter` operator, implemented via {@link mapParallel}.
 * @since v1.0.0
 */
export function filterParallel<T>(
    predicate: (value: T) => boolean | PromiseLike<boolean>,
    pool?: IWorkerPool | null
): OperatorFunction<T, T> {
    const serializedPredicate = serializeFunction(predicate)

    return pipe(
        map<T, [T, string]>(value => [value, serializedPredicate]),
        mapParallel(async ([value, _predicate]) => {
            const predicate: (value: T) => boolean | PromiseLike<boolean> = deserializeFunction(_predicate)
            const asyncResult = predicate(value)
            const result = typeof asyncResult === 'object' && asyncResult !== null && 'then' in asyncResult
                ? await asyncResult
                : asyncResult

            return result ? [value] : []
        }, pool),
        filter((box: T[]): box is [T] => box.length > 0.5),
        map(box => box[0]))
}
