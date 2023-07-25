import { filter, map, OperatorFunction, pipe } from 'rxjs'
import { IWorkerPool } from '../abstraction.js'
import { deserializeFunction, serializeFunction } from '../serialization.js'
import { mapParallel } from './mapParallel.js'

// TODO: optimize
/**
 * An analogue of RxJS `filter` operator, implemented via {@link mapParallel}.
 * @since v1.0.0
 */
export function filterParallel<T>(predicate: (value: T) => boolean, pool?: IWorkerPool | null): OperatorFunction<T, T> {
    const serializedPredicate = serializeFunction(predicate)

    return pipe(
        map<T, [T, string]>(value => [value, serializedPredicate]),
        mapParallel(([value, _predicate]) => {
            const predicate: (value: T) => boolean = deserializeFunction(_predicate)

            return predicate(value) ? [value] : []
        }, pool),
        filter((box: T[]): box is [T] => box.length > 0.5),
        map(box => box[0]))
}
