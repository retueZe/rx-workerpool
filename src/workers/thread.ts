import { MessagePort, workerData } from 'node:worker_threads'
import { MessagePortAdapter } from '../private/node-adapters.js'
import { WpcpWorkerPort } from '../private/wpcp/index.js'
import * as Serialization from '../serialization.js'

// injecting serialization functions
Object.assign(globalThis, Serialization)

const RAW_PORT: MessagePort = workerData
const ADAPTED_RAW_PORT = new MessagePortAdapter(RAW_PORT)
const PORT = new WpcpWorkerPort(ADAPTED_RAW_PORT)

while (!PORT.isAbortRequested) {
    const request = await PORT.waitForExecutionRequest()

    try {
        const result = request.callback(request.args)

        request.resolve(result)
    } catch (error) {
        request.reject(error)
    }
}

PORT.close()
