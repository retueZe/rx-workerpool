import { IdList } from '../IdList.js'
import type { WpcpPoolMethodName, WpcpRequest, WpcpResponse, WpcpWorkerMethodName } from './abstraction.js'

export abstract class WpcpPortBase {
    private readonly _listener: (event: MessageEvent) => void
    private readonly _idList = new IdList()
    private readonly _waiterMap = new Map<number, (result: any) => void>()
    private _isClosed = false

    constructor(protected readonly port: MessagePort) {
        this._listener = event => {
            const message = event.data

            if ('method' in message) {
                const request: WpcpRequest = message
                const result = this.handleRequest(request)

                if (request.id === null) return

                const response: WpcpResponse = {
                    result,
                    id: request.id
                }
                this.port.postMessage(response)

                return
            }

            const {result, id}: WpcpResponse = message
            const resolve = this._waiterMap.get(id)

            if (typeof resolve === 'undefined') throw new Error('Invalid ID.')

            this._idList.return(id)
            this._waiterMap.delete(id)
            resolve(result)
        }
        this.port.addEventListener('message', this._listener)
    }

    protected throwIfClosed(): void {
        if (this._isClosed) throw new Error('This port is closed.')
    }
    protected postRequest(method: WpcpPoolMethodName | WpcpWorkerMethodName, args: any[]): Promise<any> {
        const id = this._idList.rent()
        const request: WpcpRequest = {method, args, id}
        const promise = new Promise<any>(resolve => {
            this._waiterMap.set(id, resolve)
        })
        this.port.postMessage(request)

        return promise
    }
    protected postNotification(method: WpcpPoolMethodName | WpcpWorkerMethodName, args: any[]): void {
        const notification: WpcpRequest = {
            method,
            args,
            id: null
        }
        this.port.postMessage(notification)
    }
    protected abstract handleRequest(request: WpcpRequest): any
    close(): void {
        if (this._isClosed) return

        this._isClosed = true
        this.port.removeEventListener('message', this._listener)
    }
}
