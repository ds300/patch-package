declare module "randomstring" {
  export function generate(
    opts:
      | number
      | {
          charset?: string
          length?: number
          readable?: boolean
        },
  ): string
}
