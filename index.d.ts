import type {Literal} from 'hast'

export type {Options} from './lib/index.js'
export {raw} from './lib/index.js'

/* eslint-disable @typescript-eslint/consistent-type-definitions */

export interface Raw extends Literal {
  type: 'raw'
}

// Add `Raw` nodes to roots and elements.
declare module 'hast' {
  interface RootContentMap {
    raw: Raw
  }

  interface ElementContentMap {
    raw: Raw
  }
}

/* eslint-enable @typescript-eslint/consistent-type-definitions */
