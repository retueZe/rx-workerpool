const FUNCTION_PATTERN = /^(?:function)\s*(?<name>[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((?<args>[^)]*)\)\s*{(?<code>.*?)}$/gs

// lambdas are not allowed
export function serializeFunction(callback: (...args: any[]) => any): string {
    return callback.toString()
}
export function deserializeFunction(input: string): (...args: any[]) => any {
    const match = FUNCTION_PATTERN.exec(input)

    if (match === null) throw new Error('Bad input.')

    const {_args, code} = match.groups!
    const args = _args
        .split(',')
        .map(arg => arg.trim())

    return new Function(...args, code) as (...args: any[]) => any
}
