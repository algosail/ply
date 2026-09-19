import { assertEquals } from '@std/assert'
import type {
  _MonadUnderApplicative,
  _MonadUnderChain,
  Monad,
  MonadDict,
  MonadKeys,
  MonadShapes,
  MonadTypeRep,
} from './monad.ts'
import type { Assert } from '../core/kind.ts'
import type { Arr, ArrayShape } from '../natives/array.ts'
import type { Sets, SetShape } from '../natives/set.ts'
import type { Maps, MapShape } from '../natives/map.ts'
import type { IdentityShape } from '../data/identity.ts'
import type { MaybeShape } from '../data/maybe.ts'
import type { EitherShape } from '../data/either.ts'
import type { Pair } from '../data/pair.ts'
import type { PairShape } from '../data/pair.ts'
import { of } from './applicative.ts'
import { chain } from './chain.ts'
import { map } from './functor.ts'
import { Identity, identity } from '../data/identity.ts'
import { just, Maybe } from '../data/maybe.ts'
import { Either, right } from '../data/either.ts'

// Examples

Deno.test('Monad: the interface comes together on Maybe, Either and Identity', () => {
  for (const [name, { T, m }] of Object.entries(monads)) {
    assertEquals(
      map(increment)(m as never),
      chain((a: number) => of(T as never)(increment(a)))(m as never),
      `${name}: map through of and chain`,
    )
    const f = (n: number) => of(T as never)(n + 1)
    assertEquals(
      chain(f)(of(T as never)(1) as never),
      f(1),
      `${name}: left identity`,
    )
    assertEquals(
      chain((a: number) => of(T as never)(a))(m as never),
      m,
      `${name}: right identity`,
    )
  }
})

// Fixtures and compile-time assertions

type Assignable<A, B> = [A] extends [B] ? true : false

type Not<B extends boolean> = B extends true ? false : true

export type _UnderApplicative = Assert<_MonadUnderApplicative>

export type _UnderChain = Assert<_MonadUnderChain>

export type _KeysCoverBoth = Assert<
  Assignable<'of' | 'map' | 'ap' | 'chain', MonadKeys>
>

export type _NativesForward = Assert<
  Assignable<keyof MonadShapes, 'Array' | 'Fn' | 'Set'>
>

export type _NativesBack = Assert<
  Assignable<'Array' | 'Fn' | 'Set', keyof MonadShapes>
>

export type _ArrIsMonadDict = Assert<
  Assignable<typeof Arr, MonadDict<ArrayShape>>
>

export type _SetsIsMonadDict = Assert<
  Assignable<typeof Sets, MonadDict<SetShape>>
>

export type _MapsIsNotMonadDict = Assert<
  Not<Assignable<typeof Maps, MonadDict<MapShape>>>
>

export type _ArrayValueIsMonad = Assert<Assignable<number[], Monad<number[]>>>

export type _SetValueIsMonad = Assert<
  Assignable<Set<number>, Monad<Set<number>>>
>

export type _MapValueIsNotMonad = Assert<
  Not<Assignable<Map<string, number>, Monad<Map<string, number>>>>
>

export type _MaybeRep = Assert<
  Assignable<typeof Maybe, MonadTypeRep<MaybeShape>>
>

export type _EitherRep = Assert<
  Assignable<typeof Either, MonadTypeRep<EitherShape>>
>

export type _IdentityRep = Assert<
  Assignable<typeof Identity, MonadTypeRep<IdentityShape>>
>

export type _PairIsNotMonadRep = Assert<
  Not<Assignable<typeof Pair, MonadTypeRep<PairShape>>>
>

const increment = (n: number) => n + 1

const monads: Record<string, { readonly T: unknown; readonly m: unknown }> = {
  'Maybe': { T: Maybe satisfies MonadTypeRep<MaybeShape>, m: just(1) },
  'Either': {
    T: Either satisfies MonadTypeRep<EitherShape>,
    m: right<string, number>(1),
  },
  'Identity': {
    T: Identity satisfies MonadTypeRep<IdentityShape>,
    m: identity(1),
  },
}
