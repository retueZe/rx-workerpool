import { IWpcpWorkerPort } from '../private/wpcp/abstraction.js'
import { WpcpWorkerPort } from '../private/wpcp/WpcpWorkerPort.js'
import * as Serialization from '../serialization.js'

// injecting serialization functions
Object.assign(globalThis, Serialization)

onmessage = event => {
    const rawPort: MessagePort = event.data
    const port = new WpcpWorkerPort(rawPort)

    main(port)
}

async function main(port: IWpcpWorkerPort): Promise<void> {
    while (!port.isAbortRequested) {
        const request = await port.waitForExecutionRequest()

        try {
            const result = request.callback(request.args)

            request.resolve(result)
        } catch (error) {
            request.reject(error)
        }
    }

    port.close()
}
