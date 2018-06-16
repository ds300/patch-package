interface Options {
  nodir?: boolean
  nofile?: boolean
  depthLimit?: number
  fs?: object
  filter?: (item: Item) => boolean
}

interface Item {
  path: string
  stats: object
}

declare module "klaw-sync" {
  const klawSync: (dir: string, opts?: Options, ls?: Item[]) => Item[]
  export = klawSync
}
