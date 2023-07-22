const FUNCTION_PATTERN = /^function[^(]*\((?<args>[^)]*)\)\s*{(?<code>.*)}$/s
const LAMBDA_PATTERN = /^\((?<args>[^)]*)\)\s*=>\s*{(?<code>.*)}$/s
const INLINE_LAMBDA_PATTERN = /^(?:\((?<args>[^)]*)\)|(?<inlinedArgs>\S+))\s*=>\s*(?<result>[^{].*)$/s

const AsyncFunction: typeof Function = Object.getPrototypeOf(async function() {}).constructor
const ASYNC_FUCTION_PREFIX = 'async '

/**
 * In current implementation: `callback.toString()`.
 *
 * Supported syntaxes:
 * - `function (...) {...}`
 * - `function example(...) {...}`
 * - `async function (...) {...}`
 * - `async function example(...) {...}`
 * - `(...) => {...}`
 * - `(...) => ...`
 * - `x => {...}`
 * - `x => ...`
 * - `async (...) => {...}`
 * - `async (...) => ...`
 * - `async x => {...}`
 * - `async x => ...`
 *
 * *Methods, bound functions are not supported.*
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
 * Supported syntaxes:
 * - `function (...) {...}`
 * - `function example(...) {...}`
 * - `async function (...) {...}`
 * - `async function example(...) {...}`
 * - `(...) => {...}`
 * - `(...) => ...`
 * - `x => {...}`
 * - `x => ...`
 * - `async (...) => {...}`
 * - `async (...) => ...`
 * - `async x => {...}`
 * - `async x => ...`
 *
 * *Methods, bound functions are not supported.*
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

    const {args: _args, inlinedArgs, code: _code, result} = match.groups!
    const code = _code ?? `return ${result}`
    const args = (typeof inlinedArgs === 'string' && inlinedArgs.length > 0.5 ? inlinedArgs : _args)
        .split(',')
        .map(arg => arg.trim())

    return new constructor(...args, code) as (...args: any[]) => any
}
