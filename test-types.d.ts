import type {Literal, Parent} from 'hast'

interface CustomLiteral extends Literal {
  type: 'customLiteral'
}

interface CustomParent extends Parent {
  type: 'customParent'
}

interface MdxjsEsm extends Literal {
  type: 'mdxjsEsm'
}

// Register nodes.
declare module 'hast' {
  interface ElementContentMap {
    customLiteral: CustomLiteral
    customParent: CustomParent
  }

  interface RootContentMap {
    customLiteral: CustomLiteral
    customParent: CustomParent
    mdxjsEsm: MdxjsEsm
  }
}
