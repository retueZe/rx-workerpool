import { MessagePort as NodeMessagePort } from 'worker_threads'

export class MessagePortAdapter implements MessagePort {
    // shit typings. too lazy to type all this threefold totally unneeded crap
    private readonly _listenerMap = new Map<any, any>()

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
        const wrappedListener = (data: any): void => {
            listener.call(this, new MessageEvent('message', {
                data
            }))
        }
        this._listenerMap.set(listener, wrappedListener)

        if (once)
            this._source.once(type, wrappedListener)
        else
            this._source.on(type, wrappedListener)
    }
    removeEventListener<K extends keyof MessagePortEventMap>(
        type: K,
        listener: (this: MessagePort, event: MessagePortEventMap[K]) => any
    ): void {
        const wrappedListener = this._listenerMap.get(listener)

        if (typeof wrappedListener === 'undefined') return

        this._source.off(type, wrappedListener)
    }
    dispatchEvent(event: Event): boolean {
        return this._source.emit(event.type)
    }
}
