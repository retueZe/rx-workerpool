# `rx-workerpool`

Worker pool implementation for RxJS.

## Getting started

```javascript
import { WorkerPoolKey, mapParallel } from 'rx-workerpool'
import { of, map } from 'rxjs'

// callback taht will be runned in workers
// may also be unnamed or furthermore any kind of lambda
// also supports async functions
async function action(name) {
    // emulating blocking I/O
    for (let i = 0; i < 10000000; i++);

    return name
}

const pool = new WorkerPoolKey()
const observable = of('first', 'second', 'third').pipe(mapParallel(action))
observable.subscribe({
    next: console.log,     // log on execution completed
    complete: pool.abort() // finalize the pool
})
```

If you run this example, you will see the "names" of these workers in random order. You may remove the `Parallel` prefix from `mapParallel` to see that these names occurs sequentially and with some delay.

## Introduction

This library contains following abstraction layers:

```plaintext
  │ ┌───────────────────────────────────────┐
H │ │            RxJS operators             │
I │ ├───────────────────────────────────────┤
G │ │ IWorkerPoolKey/IWorkerPool interfaces │
H │ ├───────────────────────────────────────┤
/ │ │          Serialization layer          │
L │ ╞═══════════════════════════════════════╡ ◄─── public/private API border
O │ │              WPCP ports               │
W │ ├───────────────────────────────────────┤
  │ │         WPCP transport layer          │
  ▼ └───────────────────────────────────────┘
```

Short layer overview:

- RxJS operators — contains clones of common RxJS operators, but parallelized;
- `IWorkerPoolKey`/`IWorkerPool` interfaces — `IWorkerPool` contains a `queue` method, accepting desired callback to execute parallel and returns `IWorkerPoolItem` — just a promise with a `cancel` method; `IWorkerPoolKey` implements the `IWorkerPool` interface, contains additional methods allowing mutate pool's behavior;
- Serialization layer — use standard worker's serialization mechanism except it provides utilities for function serialization;
- WPCP (worker port communication protocol) ports — RPC-like protocol to communicate between pool's and worker's ports;
- WPCP transport layer — contains request/response/notification JSON serialization utilities and does the actual I/O work.

WPCP is an internal thing, and you should not rely on it. You may just mention that internally this library uses some kind of RPC.

## RxJS operators

This version of library contains following operators:

- `mapParallel`;
- `filterParallel`;
- `tapParallel`.

Obviously, they are just parallel analogues of the matching RxJS operators, but instead of consuming a scheduler as the second parameter they consume an instance of the `IWorkerPool` interface. The problem with creating something like `WorkerPoolScheduler` is that it won't be compatible with bound (using `this`) `rxjs` internal functions. Even after adding support for bound functions and methods, it won't work. Operator consumes observable, i.e., the observable needs to be serialized, what is impossible.

## `IWorkerPoolKey`/`IWorkerPool` interfaces

As it was mentioned before, `IWorkerPoolKey` implements `IWorkerPool` also containing some functionality to manage the pool:

- `minWorkerCount: number` — the number of free workers cannot be less than this value;
- `maxWorkerCount: number | null` — the number of all workers cannot be greater than this value; if it's `null`, no worker limit is applied;
- `abort(): Promise<void>` — starts abort process; after the first call of this method, no more callbacks can be queued, all workers are cancelled (if they are busy) and disposed (free workers immediately, busy workers upon their completion); further calls won't cause any effect;
- `isAbortRequested: boolean` — specifies whether the `abort` method has been called at least at once;
- `isAborted: boolean` — specifies whether the abort process has completed (in both successful and unsuccessful cases).

The `IWorkerPool` interface contains the `queue` method. It works by following algorithm:

- pool keeps free workers in an account, so, if there is any, just re-use it;
- if there are no free workers, then:
    - if worker count limit wasn't exceeded, then create a new worker;
    - otherwise, wait for a free one.
- serialize the callback (the first argument, no other arguments will be serialized; instead, do it manually);
- use WPCP port to start an execution;
- wait for the result and return it.

If during the whole process the pool was aborted, it will throw an error.

## Advanced techniques

### Cancellation

The `IWorkerPool.queue` method returns an instance of the `IWorkerPoolItem` interface. It is a plain JavaScript promise, but containing an additional `cancel(): void` method. Once this method has been called, a cancellation request is sent. It doesn't terminate the worker of something alike: the callback may just use `isCancellationRequested(): boolean` function to indicate whether or not cancellation was requested and do something with it. If the callback fails with an instance of a `CancellationError` class, then the callback is considered to be cancelled. This work usually does `throwIfCancellationRequested(): void` function.

### Workers' lifetime

Obviously, worker pool should have some mechanism of cleaning up workers that are free for too long. For this purpose an `IWorkerLifetime` interface was introduced. Currently, there is only one implementation of it — `TimerWorkerLifetime`, but in the further versions new narrowly focused lifetime controllers will be added.

### `desiredWorkerType`

Allows to specify what type of worker to product: web workers or worker threads. Since these solutions are incompatible, this property is useless in the current build, but in the further versions worker processes will be added, and this property will get some application.

## Examples

TODO
