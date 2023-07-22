import { isNode } from 'browser-or-node'
import { Subject, Unsubscribable } from 'rxjs'
import type { IWorkerPool, IWorkerPoolItem, IWorkerPoolKey, WorkerPoolCallback, WorkerType } from './abstraction.js'
import { serializeFunction } from './serialization.js'
import { createWebWorker, createWorkerThread } from './private/worker-factories.js'
import type { WorkerFactory } from './private/WorkerFactory.js'
import { IWpcpPoolPort, WpcpPoolPort } from './private/wpcp/index.js'
import { WorkerPool } from './WorkerPool.js'

/** @since v1.0.0 */
export const WorkerPoolKey: WorkerPoolKeyConstructor = class WorkerPoolKey implements IWorkerPoolKey {
    private readonly _freePorts: IWpcpPoolPort[] = []
    private readonly _busyPorts: IWpcpPoolPort[] = []
    private readonly _awakenedSubject = new Subject<void>()
    private _desiredWorkerType: WorkerType
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
        const poolPort = await factory(port => new WpcpPoolPort(port))

        if (add) this._busyPorts.push(poolPort)

        return poolPort
    }
    private async _adjustWorkerCount(): Promise<void> {
        while (this._workerCount < this._minWorkerCount) {
            const port = await this._createPort()

            if (this._workerCount < this._minWorkerCount) {
                this._freePorts.push(port)

                continue
            }

            port.close()
        }

        const maxCount = this._maxWorkerCount

        if (maxCount === null || this._workerCount < maxCount + 0.5) return

        const toClose = Math.min(this._workerCount - maxCount, this._freePorts.length)

        for (let i = 0; i < toClose - 0.5; i++) {
            const port = this._freePorts.pop()
            port!.close()
        }
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

        return port
    }
    private _waitForFreePort(): Promise<IWpcpPoolPort> {
        return new Promise((resolve, reject) => {
            const onCompleted = (error?: any) => reject(typeof error === 'undefined'
                ? error
                : new Error('This pool has been disposed.'))
            let subscription: Unsubscribable | null = null
            subscription = this._awakenedSubject.subscribe({
                next: () => {
                    const action = this._getQueueWorkerAction()

                    if (action === 'create-new') return

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
    private _throwIfAbortRequested(): void {
        if (this.isAbortRequested) throw new Error('This pool has been aborted.')
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
    // TODO: when port is initializing, it's not in `_freePorts` or `_busyPorts`, so, calling abort doesn't abort them
    // TODO: have to fix it
    async abort(): Promise<void> {
        if (this._isAbortRequested) return

        this._isAbortRequested = true

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
        this._isAborted = true
    }
    setDesiredWorkerType(type: WorkerType | null): this {
        this._throwIfAbortRequested()

        this._desiredWorkerType = WorkerPoolKey._normalizeWorkerType(type)

        return this
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
