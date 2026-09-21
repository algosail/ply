/**
 * Sequence wrapped computations with {@link go} and {@link fgo}.
 * Yield a wrapped value to read its contents, then return the final result.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  Assert,
  MatchableIn,
  RepIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
} from '../core/kind.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { SetShape } from '../natives/set.ts'
import type { ChainDict, ChainKeys, ChainShapes } from './chain.ts'
import type {
  ApplicativeDict,
  ApplicativeShapes,
  OfSig,
} from './applicative.ts'
import { nameOf } from '../core/instance.ts'
import { of } from './applicative.ts'
import { chain } from './chain.ts'

/**
 * Operations for wrapping and chaining values on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface MonadDict<S extends Shape>
  extends ApplicativeDict<S>, ChainDict<S> {
}

/**
 * A type representative accepted by `of`.
 * Use this to type a helper that accepts the desired result type.
 */
export type MonadTypeRep<S extends Shape, B = never> = RepIn<
  S,
  B,
  MonadShapes,
  OfSig<S, B, ChainKeys>
>

/** Names of the operations in `MonadDict`. */
export type MonadKeys = keyof MonadDict<Shape> & string

/** Native generic types accepted by the `Monad` constraint. */
export interface MonadShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
  /** The shape used for `Set` values. */
  readonly Set: SetShape
}

/** A constraint for values that support wrapping and chaining values. */
export type Monad<S, A = SlotAOf<S>, B = SlotBOf<S>> = MatchableIn<
  MonadShapes,
  A,
  B
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _MonadUnderApplicative = Assert<
  SubclassOf<MonadShapes, ApplicativeShapes>
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _MonadUnderChain = Assert<SubclassOf<MonadShapes, ChainShapes>>

/**
 * A do-block: the generator body {@link go} or {@link fgo} runs, yielding
 * values of shape `S` and returning an unwrapped result of type `A`.
 *
 * Annotate each variable assigned from `yield`; TypeScript does not infer its
 * type. The shape is the one for the wrapper being worked in, and the shapes
 * live in `@algosail/ply/shapes`. A body that recurses does so with `yield*`,
 * which keeps it inside the run already going instead of starting a second one.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 * import type { MaybeShape } from '@algosail/ply/shapes'
 *
 * function half(value: number): P.Maybe<number> {
 *   return value % 2 === 0 ? P.just(value / 2) : P.nothing()
 * }
 *
 * function* halves(times: number, value: number): P.Do<MaybeShape, number> {
 *   if (times === 0) return value
 *   const result: number = yield half(value)
 *   return yield* halves(times - 1, result)
 * }
 *
 * P.fgo(P.Maybe)(halves)(3, 8) // => Just (1)
 * ```
 */
// deno-lint-ignore no-explicit-any
export type Do<S extends Shape, A> = Generator<Kind<S, any, any>, A, any>

// deno-lint-ignore no-explicit-any
type Body = () => Generator<any, unknown, any>
type Lift = (a: unknown) => unknown
type Bind_ = (f: (a: unknown) => unknown) => (m: unknown) => unknown
type Guard = (v: unknown) => void

function guarding(
  how: string,
  is: unknown,
  named: string | undefined,
): Guard {
  const fits = typeof is === 'function'
    ? is as (v: unknown) => boolean
    : named === undefined
    ? undefined
    : (v: unknown) => nameOf(v) === named
  if (fits === undefined) return () => {}
  const name = named ?? 'this type'
  return (v) => {
    if (fits(v)) return
    throw new TypeError(
      `${how}: the body runs in ${name} but yielded ${nameOf(v)}. One body` +
        ' runs in one type — convert the value before you yield it.',
    )
  }
}

function walk(lift: Lift, bind: Bind_, guard: Guard, start: Body): unknown {
  const live = start()
  const bound: unknown[] = []
  let front = true

  const after = (
    step: IteratorResult<unknown, unknown>,
    again: (given: unknown) => unknown,
  ): unknown => {
    if (step.done) return lift(step.value)
    guard(step.value)
    return bind(again)(step.value)
  }

  const replay = (prefix: readonly unknown[]): unknown => {
    const body = start()
    let step = body.next()
    for (const given of prefix) {
      if (step.done) break
      step = body.next(given)
    }
    return after(step, (given) => replay([...prefix, given]))
  }

  const ahead = (depth: number) => (given: unknown): unknown => {
    if (!front || depth !== bound.length) {
      return replay([...bound.slice(0, depth), given])
    }
    bound.push(given)
    const step = live.next(given)
    if (step.done) front = false
    return after(step, ahead(depth + 1))
  }

  const first = live.next()
  if (first.done) front = false
  return after(first, ahead(0))
}

function engine(T: unknown, how: string): (start: Body) => unknown {
  const lift = (of as (t: unknown) => Lift)(T)
  const bind = chain as unknown as Bind_
  const rep = T as { is?: unknown; '@@type'?: unknown } | null | undefined
  const tag = rep?.['@@type']
  const named = typeof tag === 'string' ? tag : undefined
  const guard = guarding(how, rep?.is, named)
  return (start) => walk(lift, bind, guard, start)
}

/**
 * Sequence computations in one wrapper using a generator.
 * Each `yield` unwraps a value; `return` wraps the final result with `of`.
 * `Nothing`, `Left`, and empty collections stop their branch.
 *
 * Arrays and sets explore every combination. Bodies may run again when a type
 * branches or is read again, so keep side effects in the yielded computations.
 * Annotate variables assigned from `yield` and use the same wrapper throughout.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * function half(value: number): P.Maybe<number> {
 *   return value % 2 === 0 ? P.just(value / 2) : P.nothing()
 * }
 *
 * function* total() {
 *   const first: number = yield half(8)
 *   const second: number = yield half(first)
 *   return first + second
 * }
 *
 * P.go(P.Maybe)(total) // => Just (6)
 * ```
 */
export function go<S extends Shape, B>(
  T: MonadTypeRep<S, B>,
): <A>(body: () => Do<S, A>) => Kind<S, A, B>
export function go(T: unknown): (body: Body) => unknown {
  const run = engine(T, 'go')
  return (body) => run(body)
}

/**
 * Turn a generator that accepts arguments into a function returning a wrapped result.
 * Each call starts a new body. Yield and return values as in {@link go}.
 * For recursion, annotate the returned function’s type explicitly.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * function half(value: number): P.Maybe<number> {
 *   return value % 2 === 0 ? P.just(value / 2) : P.nothing()
 * }
 *
 * function* halfTwice(value: number) {
 *   const result: number = yield half(value)
 *   const quarter: number = yield half(result)
 *   return quarter
 * }
 *
 * const quarter = P.fgo(P.Maybe)(halfTwice)
 * quarter(8) // => Just (2)
 * quarter(6) // => Nothing
 * ```
 */
export function fgo<S extends Shape, B>(
  T: MonadTypeRep<S, B>,
): <A, Args extends readonly unknown[]>(
  body: (...args: Args) => Do<S, A>,
) => (...args: Args) => Kind<S, A, B>
export function fgo(
  T: unknown,
): (body: (...args: unknown[]) => Generator) => (...a: unknown[]) => unknown {
  const run = engine(T, 'fgo')
  return (body) => (...args) => run(() => body(...args))
}
