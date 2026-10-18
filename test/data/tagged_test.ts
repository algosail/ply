import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cases } from '../../src/data/tagged.ts'

type Shape =
  | { readonly tag: 'circle'; readonly r: number }
  | { readonly tag: 'square'; readonly side: number }

const area = cases<Shape, number> ({
  circle: (c) => Math.PI * c.r * c.r,
  square: (s) => s.side * s.side,
})

test ('cases: answers with the branch that names the tag', () => {
  assert.deepStrictEqual (area ({ tag: 'square', side: 3 }), 9)
  assert.deepStrictEqual (area ({ tag: 'circle', r: 1 }), Math.PI)
})

test ('cases: the branch is handed its own variant, already narrowed', () => {
  const said = cases<Shape, string> ({
    circle: (c) => `r=${c.r}`,
    square: (s) => `side=${s.side}`,
  })

  assert.deepStrictEqual (said ({ tag: 'circle', r: 2 }), 'r=2')
})

test ('cases: the branches are read once and the answer reused', () => {
  let built = 0
  const counted = cases<Shape, number> ({
    circle: (c) => (built += 1, c.r),
    square: (s) => s.side,
  })

  counted ({ tag: 'circle', r: 1 })
  counted ({ tag: 'circle', r: 1 })
  assert.deepStrictEqual (built, 2, 'the branch runs per value, not per build')
})

test ('cases: a tag nobody answered for is a run-time error', () => {
  const partial = { circle: (c: { r: number }) => c.r } as never
  assert.throws (() => cases<Shape, number> (partial) ({ tag: 'square', side: 1 }))
})
