import { assertEquals, assertThrows } from '@std/assert'
import { cases } from './tagged.ts'

type Shape =
  | { readonly tag: 'circle'; readonly r: number }
  | { readonly tag: 'square'; readonly side: number }

const area = cases<Shape, number>({
  circle: (c) => Math.PI * c.r * c.r,
  square: (s) => s.side * s.side,
})

// Examples

Deno.test('cases: answers with the branch that names the tag', () => {
  assertEquals(area({ tag: 'square', side: 3 }), 9)
  assertEquals(area({ tag: 'circle', r: 1 }), Math.PI)
})

Deno.test('cases: the branch is handed its own variant, already narrowed', () => {
  const said = cases<Shape, string>({
    circle: (c) => `r=${c.r}`,
    square: (s) => `side=${s.side}`,
  })

  assertEquals(said({ tag: 'circle', r: 2 }), 'r=2')
})

// Edge cases

Deno.test('cases: the branches are read once and the answer reused', () => {
  let built = 0
  const counted = cases<Shape, number>({
    circle: (c) => (built += 1, c.r),
    square: (s) => s.side,
  })

  counted({ tag: 'circle', r: 1 })
  counted({ tag: 'circle', r: 1 })
  assertEquals(built, 2, 'the branch runs per value, not per build')
})

Deno.test('cases: a tag nobody answered for is a run-time error', () => {
  // Reachable only from untyped data: the type requires every branch.
  const partial = { circle: (c: { r: number }) => c.r } as never
  assertThrows(() => cases<Shape, number>(partial)({ tag: 'square', side: 1 }))
})
