import type {Parent, Literal} from 'hast'

export interface CustomParent extends Parent {
  type: 'customParent'
}

export interface CustomLiteral extends Literal {
  type: 'customLiteral'
}

declare module 'hast' {
  interface RootContentMap {
    customLiteral: CustomLiteral
    customParent: CustomParent
  }

  interface ElementContentMap {
    customLiteral: CustomLiteral
    customParent: CustomParent
  }
}
