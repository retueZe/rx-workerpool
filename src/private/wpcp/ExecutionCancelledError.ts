export class ExecutionCancelledError extends Error {
    static readonly DEFAULT_MESSAGE = 'Execution has been cancelled.'

    constructor(message?: string | null) {
        super(message ?? ExecutionCancelledError.DEFAULT_MESSAGE)
        this.name = ExecutionCancelledError.name
    }
}
