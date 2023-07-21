import { main } from '../private/worker-main.js'
import { WpcpWorkerPort } from '../private/wpcp/WpcpWorkerPort.js'
import * as Serialization from '../serialization.js'

// injecting serialization functions
Object.assign(globalThis, Serialization)

onmessage = event => {
    const rawPort: MessagePort = event.data
    const port = new WpcpWorkerPort(rawPort)

    main(port)
}
