const FUNCTION_PATTERN = /^(?:function)[^(]*\((?<args>[^)]*)\)\s*{(?<code>.*?)}$/gs
const LAMBDA_PATTERN = /^\((?<args>[^)]*)\)\s*=>\s*{(?<code>.*)}$/gs
const INLINE_LAMBDA_PATTERN = /^\((?<args>[^)]*)\)\s*=>\s*(?<result>[^{].*)$/gs

const AsyncFunction: typeof Function = Object.getPrototypeOf(async function(){}).constructor
const ASYNC_FUCTION_PREFIX = 'async '

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
    let constructor = Function

    if (input.startsWith(ASYNC_FUCTION_PREFIX)) {
        input = input.slice(ASYNC_FUCTION_PREFIX.length)
        constructor = AsyncFunction
    }

    const match = FUNCTION_PATTERN.exec(input)
        ?? LAMBDA_PATTERN.exec(input)
        ?? INLINE_LAMBDA_PATTERN.exec(input)

    if (match === null) throw new Error('Bad input.')

    const {args: _args, code: _code, result} = match.groups!
    const code = _code ?? `return ${result}`
    const args = _args
        .split(',')
        .map(arg => arg.trim())

    return new constructor(...args, code) as (...args: any[]) => any
}
