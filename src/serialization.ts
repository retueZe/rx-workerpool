const FUNCTION_PATTERN = /^(?:function)[^(]*\((?<args>[^)]*)\)\s*{(?<code>.*?)}$/gs
const LAMBDA_PATTERN = /^\((?<args>[^)]*)\)\s*=>\s*{(?<code>.*)}$/gs

/**
 * In current implementation: `callback.toString()`.
 *
 * **This function is injected in workers' global scope.**
 * @since v1.0.0
 */
export function serializeFunction(callback: (...args: any[]) => any): string {
    return callback.toString()
}
/**
 * Deserializes {@link serializeFunction} result and returns dynamically created function via {@link Function}'s constructor.
 *
 * **This function is injected in workers' global scope.**
 * @since v1.0.0
 */
export function deserializeFunction(input: string): (...args: any[]) => any {
    const match = FUNCTION_PATTERN.exec(input) ?? LAMBDA_PATTERN.exec(input)

    if (match === null) throw new Error('Bad input.')

    const {args: _args, code} = match.groups!
    const args = _args
        .split(',')
        .map(arg => arg.trim())

    return new Function(...args, code) as (...args: any[]) => any
}
