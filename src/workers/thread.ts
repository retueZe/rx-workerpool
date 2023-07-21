import { MessagePort, workerData } from 'node:worker_threads'
import { MessagePortAdapter } from '../private/node-adapters.js'
import { main } from '../private/worker-main.js'
import { WpcpWorkerPort } from '../private/wpcp/index.js'
import * as Serialization from '../serialization.js'

// injecting serialization functions
Object.assign(globalThis, Serialization)

const RAW_PORT: MessagePort = workerData
const ADAPTED_RAW_PORT = new MessagePortAdapter(RAW_PORT)
const PORT = new WpcpWorkerPort(ADAPTED_RAW_PORT)

await main(PORT)
