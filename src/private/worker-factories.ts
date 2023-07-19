import { MessagePortAdapter } from './node-adapters.js'

const NODE_ENVIRONMENT: {
    worker_threads: typeof import('node:worker_threads') | null
    url: typeof import('node:url') | null
    path: typeof import('node:path') | null
} = {
    worker_threads: null,
    url: null,
    path: null
}

export async function createWebWorker<T>(factory: (port: MessagePort) => T): Promise<T> {
    const workerUrl = getWebWorkerUrl()
    const worker = new Worker(workerUrl)
    const channel = new MessageChannel()
    const port = factory(channel.port1)
    worker.postMessage(channel.port2, [channel.port2])

    return port
}
export async function createWorkerThread<T>(factory: (port: MessagePort) => T): Promise<T> {
    const wt = NODE_ENVIRONMENT.worker_threads ??= await import('node:worker_threads')
    const workerPath = await getNodeWorkerPath('thread')
    const channel = new wt.MessageChannel()
    const port = factory(new MessagePortAdapter(channel.port1))

    new wt.Worker(workerPath, {
        workerData: channel.port2,
        transferList: [channel.port2]
    })

    return port
}

async function getNodeWorkerPath(name: string): Promise<string> {
    const url = NODE_ENVIRONMENT.url ??= await import('node:url')
    const path = NODE_ENVIRONMENT.path ??= await import('node:path')

    const __filename = url.fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)

    return path.join(__dirname, `../workers/${name}.js`)
}
function getWebWorkerUrl(): string {
    return 'https://www.unpkg.com/rx-workerpool/build/workers/web.js'
}
