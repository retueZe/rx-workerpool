export type RpcPoolParamsTypeMap = {
    'execute': [string, any[]]
    'abort': string
    'terminate': null
}
export type RpcPoolNotificationMethodName = 'terminate'
export type RpcPoolResultTypeMap = {
    'execute': string
}
export type RpcWorkerParamsTypeMap = {
    'ready': null
    'done': {token: string, result: any} | {token: string, error: any}
}

export type RpcRequest<
    M extends Record<string, any> = Record<string, any>,
    N extends keyof M = keyof M,
    K extends keyof M = keyof M
> = {
    jsonrpc: '2.0',
    method: N,
    params: M[N],
    id: K extends N ? null : number
}
export type RpcPoolRequest<N extends keyof RpcPoolParamsTypeMap> =
    RpcRequest<RpcPoolParamsTypeMap, RpcPoolNotificationMethodName, N>
export type RpcWorkerRequest<N extends keyof RpcWorkerParamsTypeMap> =
    RpcRequest<RpcWorkerParamsTypeMap, keyof RpcWorkerParamsTypeMap, N>

export type RpcResponse<
    M extends Record<string, any> = Record<string, any>,
    N extends keyof M = keyof M
> = {
    jsonrpc: '2.0',
    result: M[N],
    id: number
} | {
    jsonrpc: '2.0',
    error: {code: number, message: string},
    id: number
}
