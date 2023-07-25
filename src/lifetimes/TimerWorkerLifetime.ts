import { IWorkerLifetime } from '../abstraction.js'

export const TimerWorkerLifetime: Constructor = class TimerWorkerLifetime implements IWorkerLifetime {
    private readonly _delay: number
    private _count = 0
    private _onExpired: ((count: number) => void) | null = null
    private _timeout: NodeJS.Timeout | null = null
    get count(): number {
        return this._count
    }
    set count(value: number) {
        value = Math.floor(value ?? 1)

        if (value < -0.5) throw new RangeError('Negative count.')

        const delta = value - this._count
        this._count = value
        this._runTimer()

        if (this._onExpired !== null && delta < -0.5)
            this._onExpired(-delta)
    }
    get onExpired(): typeof this._onExpired {
        return this._onExpired
    }
    set onExpired(value: typeof this._onExpired) {
        this._onExpired = value
        this._runTimer()
    }

    constructor(delay: number) {
        this._delay = Math.floor(delay)

        if (delay < -0.5) throw new RangeError('Negative delay.')
    }

    private _runTimer(): void {
        if (this._timeout !== null) {
            clearTimeout(this._timeout)
            this._timeout = null
        }
        if (this._count < 0.5 || this._onExpired === null) return

        this._timeout = setTimeout(() => {
            this._timeout = null

            if (this._count < 0.5) return

            this.count--
        }, this._delay * 1000)
    }
}
type Constructor = {
    /**
     * Delay in seconds.
     * @since v1.0.0
     */
    new(delay: number): IWorkerLifetime
}
