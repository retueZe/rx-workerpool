export class CancellationError extends Error {
    static readonly DEFAULT_MESSAGE = 'The operation has been cancelled.'

    constructor(message?: string | null) {
        super(message ?? CancellationError.DEFAULT_MESSAGE)
        this.name = CancellationError.name
    }
}
