export default function removeCarriageReturns(original: Buffer): Buffer {
  const withoutCarriageReturns = Buffer.alloc(original.length)

  let j = 0
  for (let i = 0; i < original.length; i++) {
    const byte = original[i]
    if (byte !== 13) {
      withoutCarriageReturns[j++] = byte
    }
  }

  return withoutCarriageReturns.slice(0, j)
}
