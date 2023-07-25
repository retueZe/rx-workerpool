import { Subject } from 'rxjs'
import { deserializeFunction } from '../../serialization.js'
import type { IWpcpCancellationSignal, IWpcpCancellationSource, IWpcpWorkerPort, WpcpExecutionRequest, WpcpExecutionStatus, WpcpRequest } from './abstraction.js'
import { CancellationError } from '../../CancellationError.js'
import { generateToken } from './generateToken.js'
import { PortAbortedError } from './PortAbortedError.js'
import { WpcpPortBase } from './WpcpPortBase.js'

export class WpcpWorkerPort extends WpcpPortBase implements IWpcpWorkerPort {
    private readonly _executionRequestSubject = new Subject<WpcpExecutionRequest>()
    private _currentToken: string | null = null
    private _currentCancellationSource: IWpcpCancellationSource | null = null
    private _isClosed2 = false
    private _isAbortRequested = false
    get isAbortRequested(): boolean {
        return this._isAbortRequested
    }

    constructor(port: MessagePort) {
        super(port)
        this.postNotification('ready', [])
    }

    private _endExecution(status: WpcpExecutionStatus, value: any): void {
        const token = this._currentToken

        if (token === null) throw new Error('STUB')

        this._currentToken = null
        this._currentCancellationSource?.cancel()
        this._currentCancellationSource = null
        this.postNotification('end-execute', [token, status, value])

        if (this.isAbortRequested) this.close()
    }
    private _beginExecution(_callback: string, args: any[]): string | null {
        if (this.isAbortRequested) return null
        if (this._currentToken !== null) return null

        const callback = deserializeFunction(_callback)
        const token = this._currentToken = generateToken()
        this._currentCancellationSource = new CancellationSource()
        this._executionRequestSubject.next({
            callback,
            args,
            cancellationSource: this._currentCancellationSource,
            resolve: result => {
                if (this._currentToken !== token) return

                this._endExecution('succeeded', result)
            },
            reject: error => {
                if (this._currentToken !== token) return
                if (error instanceof CancellationError)
                    this._endExecution('cancelled', error)
                else
                    this._endExecution('failed', error)
            }
        })

        return this._currentToken
    }
    protected handleRequest(request: WpcpRequest): any {
        if (request.method === 'begin-execute') {
            const [_callback, args] = request.args as [string, any[]]

            return this._beginExecution(_callback, args)
        } else if (request.method === 'cancel') {
            const cancellationSource = this._currentCancellationSource

            if (cancellationSource === null) return

            cancellationSource.cancel()
        } else if (request.method === 'abort') {
            this._isAbortRequested = true
            this._currentCancellationSource?.cancel()
            this._executionRequestSubject.complete()
        }
    }
    close(): void {
        if (this._isClosed2) return

        this._isAbortRequested = true

        if (this._currentToken === null) {
            this._isClosed2 = true
            this._executionRequestSubject.complete()
            super.close()

            return
        }
    }
    waitForExecutionRequest(): Promise<WpcpExecutionRequest> {
        if (this.isAbortRequested) throw new Error('This port has been closed.')

        return new Promise<WpcpExecutionRequest>((resolve, reject) => {
            const onCompleted = (error?: any): void => reject(typeof error === 'undefined'
                ? new PortAbortedError('This port has been closed.')
                : error)
            this._executionRequestSubject.subscribe({
                next: resolve,
                error: onCompleted,
                complete: onCompleted
            })
        })
    }
}
class CancellationSource implements IWpcpCancellationSource, IWpcpCancellationSignal {
    private readonly _cancellationSubject = new Subject<void>()
    private _isCancelled = false
    get signal(): IWpcpCancellationSignal {
        return this
    }
    get isCancellationRequested(): boolean {
        return this._isCancelled
    }

    constructor() {}

    waitForCancellation(): Promise<void> {
        return new Promise(resolve => {
            this._cancellationSubject.subscribe({complete: resolve})
        })
    }
    cancel(): void {
        if (this._isCancelled) return

        this._isCancelled = true
        this._cancellationSubject.complete()
    }
    throwIfCancellationRequested(): void {
        if (this.isCancellationRequested) throw new CancellationError()
    }
}
