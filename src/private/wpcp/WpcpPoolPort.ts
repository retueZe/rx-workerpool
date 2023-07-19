import { Subject, Unsubscribable } from 'rxjs'
import { IWpcpCancellationSignal, IWpcpCancellationSource, IWpcpPoolPort, WpcpExecutionStatus, WpcpRequest } from './abstraction.js'
import { ExecutionCancelledError } from './ExecutionCancelledError.js'
import { WpcpPortBase } from './WpcpPortBase.js'

export class WpcpPoolPort extends WpcpPortBase implements IWpcpPoolPort {
    private readonly _endExecuteSubject = new Subject<string>()
    private readonly _pendingResults = new Map<string, [WpcpExecutionStatus, any]>()
    private readonly _readySubject = new Subject<void>()
    private _isReady = false
    private _isClosed2 = false

    constructor(port: MessagePort) {
        super(port)
    }

    private _waitForReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._readySubject.subscribe({
                error: reject,
                complete: resolve
            })
        })
    }
    protected handleRequest(request: WpcpRequest): any {
        if (request.method === 'ready') {
            this._isReady = true
            this._readySubject.complete()
        } else if (request.method === 'end-execute') {
            const [token, status, value] = request.args as [string, WpcpExecutionStatus, any]

            this._pendingResults.set(token, [status, value])
            this._endExecuteSubject.next(token)
        }
    }
    close(): void {
        if (this._isClosed2) return

        this._isClosed2 = true
        this._readySubject.error(new Error('This port has been closed.'))
        this._endExecuteSubject.complete()
        super.close()
    }
    async beginExecute(callback: string, args: any[]): Promise<string | null> {
        this.throwIfClosed()

        if (!this._isReady) await this._waitForReady()

        return await this.postRequest('begin-execute', [callback, args])
    }
    createCancellationSource(token: string): IWpcpCancellationSource {
        this.throwIfClosed()

        return new CancellationSource(this.port, token)
    }
    getResult(token: string): Promise<any> {
        this.throwIfClosed()

        if (this._pendingResults.has(token)) {
            const [status, value] = this._pendingResults.get(token)!

            return status === 'succeeded'
                ? Promise.resolve(value)
                : Promise.reject(value)
        }

        return new Promise((resolve, reject) => {
            const onCompleted = () => new Error('This port has been closed.')
            let subscribtion: Unsubscribable | null = null
            subscribtion = this._endExecuteSubject.subscribe({
                next: awakenedToken => {
                    if (awakenedToken !== token) return

                    subscribtion?.unsubscribe()
                    subscribtion = null
                    const [status, value] = this._pendingResults.get(token)!

                    if (status === 'succeeded')
                        resolve(value)
                    else
                        reject(value)
                },
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

    constructor(
        private readonly _port: MessagePort,
        private readonly _token: string
    ) {}

    waitForCancellation(): Promise<void> {
        return new Promise(resolve => {
            this._cancellationSubject.subscribe({complete: resolve})
        })
    }
    cancel(): void {
        if (this._isCancelled) return

        this._isCancelled = true
        const notification: WpcpRequest = {
            method: 'cancel',
            args: [this._token],
            id: null
        }
        this._port.postMessage(notification)
        this._cancellationSubject.complete()
    }
    throwIfCancellationRequested(): void {
        if (this.isCancellationRequested) throw new ExecutionCancelledError()
    }
}
