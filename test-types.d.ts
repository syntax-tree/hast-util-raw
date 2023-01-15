import type {Parent, Literal} from 'hast'

/* eslint-disable @typescript-eslint/consistent-type-definitions */

export interface CustomParent extends Parent {
  type: 'customParent'
}

export interface CustomLiteral extends Literal {
  type: 'customLiteral'
}

export interface MdxjsEsm extends Literal {
  type: 'mdxjsEsm'
}

declare module 'hast' {
  interface RootContentMap {
    customLiteral: CustomLiteral
    customParent: CustomParent
    mdxjsEsm: MdxjsEsm
  }

  interface ElementContentMap {
    customLiteral: CustomLiteral
    customParent: CustomParent
  }
}

/* eslint-enable @typescript-eslint/consistent-type-definitions */
