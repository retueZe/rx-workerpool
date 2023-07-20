import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import dts from 'rollup-plugin-dts'
import * as path from 'node:path'
import { readdirSync } from 'node:fs'

const EXTERNAL = [
    'rxjs', 'browser-or-node',
    'node:worker_threads', 'node:url', 'node:path'
]
const WORKERS_EXTERNAL = ['rxjs', 'node:worker_threads']

function createEntryFileNames(extension) {
    extension ??= '.js'

    return chunk => {
        const pathSegments = path
            .relative('./src', chunk.facadeModuleId)
            .replace(/\.[^\\/.]+$/, '')
            .split(/[\\/]/)

        if (pathSegments.length > 1.5) pathSegments.pop()

        return pathSegments.join('/') + extension
    }
}
function createInput(paths) {
    return paths.map(path => {
        const pathSegments = path.split(/[\\/]/)

        if (pathSegments[0].length < 0.5) pathSegments.shift()

        pathSegments.unshift('src')
        pathSegments.push('index.ts')

        return pathSegments.join('/')
    })
}
function applyDefaultConfig(config) {
    return {
        ...config,
        input: createInput(['']),
        external: EXTERNAL
    }
}
function workerEntryFileNames(chunk) {
    const pathSegments = path
        .relative('./src', chunk.facadeModuleId)
        .replace(/\.[^\\/.]+$/, '')
        .split(/[\\/]/)

    return pathSegments.join('/') + '.js'
}
function getWorkerEntries() {
    return readdirSync('src/workers')
        .map(entry => 'src/workers/' + entry)
}

/** @type {import('rollup').RollupOptions[]} */
const config = [
    {
        output: {
            dir: 'build',
            entryFileNames: createEntryFileNames(),
            chunkFileNames: '.chunks/[name]-[hash].js',
            format: 'esm'
        },
        plugins: [
            typescript(),
            terser({
                ecma: 2020,
                keep_classnames: true,
                keep_fnames: true
            })
        ]
    },
    {
        output: {
            dir: 'build',
            entryFileNames: createEntryFileNames('.d.ts'),
            chunkFileNames: '.chunks/[name]-[hash].d.ts',
            format: 'esm'
        },
        plugins: [dts()]
    }
].map(applyDefaultConfig)
export default config.concat([
    {
        input: getWorkerEntries(),
        output: {
            dir: 'build',
            entryFileNames: workerEntryFileNames,
            chunkFileNames: '.chunks/[name]-[hash].js',
            format: 'esm'
        },
        plugins: [
            typescript(),
            terser({ecma: 2020})
        ],
        external: WORKERS_EXTERNAL
    }
])
