export class PortAbortedError extends Error {
    static readonly DEFAULT_MESSAGE = 'This port has been aborted.'

    constructor(message?: string | null) {
        super(message ?? PortAbortedError.DEFAULT_MESSAGE)
        this.name = PortAbortedError.name
    }
}
