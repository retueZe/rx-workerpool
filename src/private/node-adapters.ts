import { MessagePort as NodeMessagePort } from 'worker_threads'

export class MessagePortAdapter implements MessagePort {
    onmessage: ((this: MessagePort, ev: MessageEvent<any>) => any) | null =
        MessagePortAdapter._defaultOnMessage.bind(this)
    onmessageerror: ((this: MessagePort, ev: MessageEvent<any>) => any) | null =
        MessagePortAdapter._defaultOnMessageError.bind(this)

    constructor(private readonly _source: NodeMessagePort) {}

    private static _defaultOnMessage(this: MessagePortAdapter, event: MessageEvent): any {
        this._source.emit('message', event.data)
    }
    private static _defaultOnMessageError(this: MessagePortAdapter, event: MessageEvent): any {
        this._source.emit('messageerror', event.data)
    }
    close(): void {
        this._source.close()
    }
    postMessage(message: any): void {
        this._source.postMessage(message)
    }
    start(): void {
        this._source.start()
    }
    addEventListener<K extends keyof MessagePortEventMap>(
        type: K,
        listener: (this: MessagePort, event: MessagePortEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions | undefined
    ): void {
        const once = typeof options === 'boolean'
            ? options
            : options?.once ?? false

        if (once)
            this._source.once(type, listener)
        else
            this._source.on(type, listener)
    }
    removeEventListener<K extends keyof MessagePortEventMap>(
        type: K,
        listener: (this: MessagePort, event: MessagePortEventMap[K]) => any
    ): void {
        this._source.off(type, listener)
    }
    dispatchEvent(event: Event): boolean {
        return this._source.emit(event.type)
    }
}
