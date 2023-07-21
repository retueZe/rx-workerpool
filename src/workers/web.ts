import type { IWpcpWorkerPort } from '../private/wpcp/abstraction.js'
import { PortAbortedError } from '../private/wpcp/PortAbortedError.js'
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
        const request = await port.waitForExecutionRequest().catch(error => error.name === PortAbortedError.name
            ? null
            : Promise.reject(error))

        if (request === null) break

        try {
            let result = request.callback(...request.args)

            if (typeof result === 'object' && result !== null &&
                typeof result.then === 'function')
                result = await result

            request.resolve(result)
        } catch (error) {
            request.reject(error)
        }
    }

    port.close()
}
