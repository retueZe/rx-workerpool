import { IWpcpWorkerPort } from './wpcp/abstraction.js'
import { PortAbortedError } from './wpcp/PortAbortedError.js'

export async function main(port: IWpcpWorkerPort): Promise<void> {
    while (!port.isAbortRequested) {
        const request = await port.waitForExecutionRequest()
            .catch(error => error.name === PortAbortedError.name
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
