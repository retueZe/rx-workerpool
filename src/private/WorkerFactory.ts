export type WorkerFactory = <T>(factory: (port: MessagePort) => T) => Promise<T>
