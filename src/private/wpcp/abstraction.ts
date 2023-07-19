export type WpcpPoolArgsTypeMap = {
    'primary-ready': []
    'secondary-ready': []
    'begin-execute': [callback: string, args: any[]]
    'cancel': [token: string]
    'abort': []
}
export type WpcpPoolResultTypeMap = {
    'begin-execute': string | null
}
export type WpcpPoolMethodName = keyof WpcpPoolArgsTypeMap
export type WpcpWorkerArgsTypeMap = {
    'primary-ready': []
    'secondary-ready': []
    'end-execute': [token: string, status: WpcpExecutionStatus, value: any]
}
export type WpcpWorkerMethodName = keyof WpcpWorkerArgsTypeMap
export type WpcpExecutionStatus =
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'cancelled'

export type WpcpRequest = {
    method: WpcpPoolMethodName | WpcpWorkerMethodName
    args: any[]
    id: number | null
}
export type WpcpResponse = {
    result: any
    id: number
}

export interface IWpcpPoolPort {
    close(): void
    beginExecute(callback: string, args: any[]): Promise<string | null>
    createCancellationSource(token: string): IWpcpCancellationSource
    getResult(token: string): Promise<any>
}
export interface IWpcpWorkerPort {
    readonly isAbortRequested: boolean

    close(): void
    waitForExecutionRequest(): Promise<WpcpExecutionRequest>
}
export type WpcpExecutionRequest = {
    callback: (...args: any[]) => any
    args: any[]
    cancellationSource: IWpcpCancellationSource
    resolve: (result: any) => void
    reject: (error: any) => void
}
export interface IWpcpCancellationSource {
    readonly signal: IWpcpCancellationSignal

    cancel(): void
}
export interface IWpcpCancellationSignal {
    readonly isCancellationRequested: boolean

    waitForCancellation(): Promise<void>
    throwIfCancellationRequested(): void
}
