import { MessagePort, workerData } from 'node:worker_threads'
import { MessagePortAdapter } from '../private/node-adapters.js'
import { PortAbortedError, WpcpWorkerPort } from '../private/wpcp/index.js'
import * as Serialization from '../serialization.js'

// injecting serialization functions
Object.assign(globalThis, Serialization)

const RAW_PORT: MessagePort = workerData
const ADAPTED_RAW_PORT = new MessagePortAdapter(RAW_PORT)
const PORT = new WpcpWorkerPort(ADAPTED_RAW_PORT)

while (!PORT.isAbortRequested) {
    const request = await PORT.waitForExecutionRequest().catch(error => error.name === PortAbortedError.name
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

PORT.close()
