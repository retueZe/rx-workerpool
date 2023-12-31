import { isNode } from 'browser-or-node'
import { Subject, Unsubscribable } from 'rxjs'
import type { IWorkerLifetime, IWorkerPool, IWorkerPoolItem, IWorkerPoolKey, WorkerPoolCallback, WorkerType } from './abstraction.js'
import { serializeFunction } from './serialization.js'
import { createWebWorker, createWorkerThread } from './private/worker-factories.js'
import type { WorkerFactory } from './private/WorkerFactory.js'
import { IWpcpPoolPort, WpcpPoolPort } from './private/wpcp/index.js'
import { WorkerPool } from './WorkerPool.js'

/** @since v1.0.0 */
export const WorkerPoolKey: WorkerPoolKeyConstructor = class WorkerPoolKey implements IWorkerPoolKey {
    private readonly _freePorts: IWpcpPoolPort[] = []
    private readonly _busyPorts: IWpcpPoolPort[] = []
    // fires when there's an oppotunity to get a worker
    // MAYBE: use async/asap/queue scheduler?
    private readonly _awakenedSubject = new Subject<void>()
    private _desiredWorkerType: WorkerType
    private _lifetime: IWorkerLifetime | null = null
    private _minWorkerCount: number
    private _maxWorkerCount: number | null
    private _isAbortRequested = false
    private _isAborted = false
    private get _workerCount(): number {
        return this._freePorts.length + this._busyPorts.length
    }
    readonly pool: IWorkerPool = new WorkerPool(this)
    get minWorkerCount(): number {
        return this._minWorkerCount
    }
    set minWorkerCount(value: number) {
        value = Math.floor(value)

        if (value < -0.5 || (this._maxWorkerCount !== null && value > this._maxWorkerCount + 0.5))
            throw new RangeError('Min worker count is out of range.')

        this._minWorkerCount = value
        this._adjustWorkerCount()
    }
    get maxWorkerCount(): number | null {
        return this._maxWorkerCount
    }
    set maxWorkerCount(value: number | null) {
        value = value === null ? null : Math.floor(value)

        if (value !== null && value < this._minWorkerCount)
            throw new RangeError('Max worker count is out of range.')

        this._maxWorkerCount = value
        this._adjustWorkerCount()
    }
    get isAbortRequested(): boolean {
        return this._isAbortRequested
    }
    get isAborted(): boolean {
        return this._isAborted
    }

    constructor(options?: Readonly<WorkerPoolOptions> | null) {
        this._desiredWorkerType = WorkerPoolKey._normalizeWorkerType(options?.desiredWorkerType)
        this._minWorkerCount = Math.floor(options?.minWorkerCount ?? 0)
        this._maxWorkerCount = options?.maxWorkerCount ?? null

        if (this._maxWorkerCount !== null)
            this._maxWorkerCount = Math.floor(this._maxWorkerCount)

        this.setLifetime(options?.lifetime ?? null)
    }

    private static _normalizeWorkerType(type: WorkerType | null | undefined): WorkerType {
        return type ?? (isNode ? 'worker-thread' : 'web-worker')
    }
    private _getWorkerFactory(): WorkerFactory {
        return this._desiredWorkerType === 'web-worker'
            ? createWebWorker
            : createWorkerThread
    }
    private async _createPort(add?: boolean | null): Promise<IWpcpPoolPort> {
        add ??= false
        const factory = this._getWorkerFactory()
        const port = await factory(port => new WpcpPoolPort(port))

        if (this.isAbortRequested) {
            port.close()

            throw this._getAbortError()
        }
        if (add) this._busyPorts.push(port)

        return port
    }
    private async _adjustWorkerCount(): Promise<void> {
        const lifetime = this._lifetime
        this.setLifetime(null)

        while (this._workerCount < this._minWorkerCount) {
            const port = await this._createPort()

            if (this._workerCount < this._minWorkerCount) {
                this._freePorts.push(port)

                continue
            }

            port.close()
        }

        const maxCount = this._maxWorkerCount

        if (maxCount !== null && this._workerCount > maxCount + 0.5) {
            const toClose = Math.min(this._workerCount - maxCount, this._freePorts.length)

            for (let i = 0; i < toClose - 0.5; i++) {
                const port = this._freePorts.pop()
                port!.close()
            }
        }

        this.setLifetime(lifetime)
        this._awakenedSubject.next()
    }
    private _getQueueWorkerAction(): QueueWorkerAction {
        return this._freePorts.length > 0.5
            ? 'reuse-cached'
            : this._maxWorkerCount === null || this._workerCount < this._maxWorkerCount - 0.5
                ? 'create-new'
                : 'wait-for-available'
    }
    private _reusePort(): IWpcpPoolPort {
        const port = this._freePorts.pop()

        if (typeof port === 'undefined') throw new Error('STUB')

        this._busyPorts.push(port)

        if (this._lifetime !== null && this._lifetime.count > 0.5)
            this._lifetime.count--

        return port
    }
    private _waitForFreePort(): Promise<IWpcpPoolPort> {
        return new Promise((resolve, reject) => {
            const onCompleted = (error?: any) => reject(typeof error === 'undefined'
                ? error
                : this._getAbortError())
            let subscription: Unsubscribable | null = null
            subscription = this._awakenedSubject.subscribe({
                next: () => {
                    const action = this._getQueueWorkerAction()

                    if (action === 'wait-for-available') return

                    subscription?.unsubscribe()
                    subscription = null

                    if (action === 'reuse-cached') {
                        const port = this._reusePort()
                        resolve(port)

                        return
                    }

                    const stub = {} as IWpcpPoolPort
                    this._busyPorts.push(stub)

                    this._createPort().then(port => {
                        const stubIndex = this._busyPorts.indexOf(stub)

                        if (stubIndex < -0.5) throw new Error('STUB')

                        // not using `_createPort(true)` to perform stub replacement atomically
                        // (`_createPort(true)` does only the second call)
                        this._busyPorts.splice(stubIndex, 1)
                        this._busyPorts.push(port)

                        resolve(port)
                    })
                },
                error: onCompleted,
                complete: onCompleted
            })
        })
    }
    private _getAbortError(): Error {
        return new Error('This pool has been aborted.')
    }
    private _throwIfAbortRequested(): void {
        if (this.isAbortRequested) throw this._getAbortError()
    }
    private async _queueImpl(callback: (...args: any[]) => any, args: any[]): Promise<[IWpcpPoolPort, string]> {
        const action = this._getQueueWorkerAction()
        const port = action === 'reuse-cached'
            ? this._reusePort()
            : action === 'create-new'
                ? await this._createPort(true)
                : await this._waitForFreePort()
        const serializedCallback = serializeFunction(callback)
        const token = await port.beginExecute(serializedCallback, args)

        if (token === null) throw new Error('STUB: Free port being executing')

        return [port, token]
    }
    private _onExpired(count: number): void {
        const ports = this._freePorts.splice(0, count)

        for (const port of ports)
            port.close()
    }
    async abort(): Promise<void> {
        if (this._isAbortRequested) return

        try {
            this._isAbortRequested = true
            this.setLifetime(null)

            for (const port of this._freePorts)
                port.close()

            this._freePorts.length = 0

            if (this._busyPorts.length > 0.5) await new Promise<void>((resolve, reject) => {
                let subscription: Unsubscribable | null = null
                subscription = this._awakenedSubject.subscribe({
                    next: () => {
                        const port = this._freePorts.pop()!
                        port.close()

                        if (this._busyPorts.length > 0.5) return

                        subscription?.unsubscribe()
                        subscription = null
                        resolve()
                    },
                    error: reject,
                    complete: () => reject(new Error('STUB: other source of completion'))
                })
            })

            this._awakenedSubject.complete()
        } finally {
            this._isAborted = true
        }
    }
    setDesiredWorkerType(type: WorkerType | null): void {
        this._throwIfAbortRequested()

        this._desiredWorkerType = WorkerPoolKey._normalizeWorkerType(type)
    }
    setLifetime(lifetime: IWorkerLifetime | null): void {
        if (this._lifetime !== null) {
            this._lifetime.onExpired = null
            this._lifetime.count = 0
            this._lifetime = null
        }
        if (lifetime !== null) {
            lifetime.onExpired = null
            lifetime.count = this._freePorts.length - this._minWorkerCount
            lifetime.onExpired = this._onExpired.bind(this)
            this._lifetime = lifetime
        }
    }
    queue<A extends any[], R>(callback: WorkerPoolCallback<A, R>, ...args: A): IWorkerPoolItem<R> {
        this._throwIfAbortRequested()

        const promise = this._queueImpl(callback, args)
        const resultPromise = promise
            .then(([port, token]) => port.getResult(token).finally(() => {
                const portIndex = this._busyPorts.indexOf(port)

                if (portIndex < -0.5) throw new Error('STUB')

                this._busyPorts.splice(portIndex, 1)
                this._freePorts.push(port)

                if (this._lifetime !== null && this._freePorts.length > this._minWorkerCount + 0.5)
                    this._lifetime.count++

                this._awakenedSubject.next()
            }))
        const cancel = () => promise.then(([port, token]) => {
            const source = port.createCancellationSource(token)
            source.cancel()
        })

        return new WorkerPoolItem(resultPromise, cancel)
    }
}
type WorkerPoolKeyConstructor = {
    /** @since v1.0.0 */
    new(options?: Readonly<WorkerPoolOptions> | null): IWorkerPoolKey
}
/** @since v1.0.0 */
export type WorkerPoolOptions = Partial<{
    /** @since v1.0.0 */
    desiredWorkerType: WorkerType | null
    /** @since v1.0.0 */
    minWorkerCount: number | null
    /** @since v1.0.0 */
    maxWorkerCount: number | null
    /** @since v1.0.0 */
    lifetime: IWorkerLifetime | null
}>
type QueueWorkerAction =
    | 'reuse-cached'
    | 'create-new'
    | 'wait-for-available'
class WorkerPoolItem<T> implements IWorkerPoolItem<T> {
    _isCancelled = false

    get [Symbol.toStringTag](): string {
        return WorkerPoolItem.name
    }

    constructor(
        private readonly _promise: Promise<T>,
        private readonly _cancel: () => any
    ) {}

    cancel(): void {
        if (this._isCancelled) return

        this._isCancelled = true
        this._cancel()
    }
    then<U = T, E = never>(
        onResolved?: ((value: T) => U | PromiseLike<U>) | null,
        onRejected?: ((reason: any) => E | PromiseLike<E>) | null
    ): Promise<U | E> {
        return this._promise.then(onResolved, onRejected)
    }
    catch<U = never>(onRejected?: ((reason: any) => U | PromiseLike<U>) | null): Promise<T | U> {
        return this._promise.catch(onRejected)
    }
    finally(onFinally?: (() => void) | null): Promise<T> {
        return this._promise.finally(onFinally)
    }
}
