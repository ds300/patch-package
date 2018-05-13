import { executeTestCase } from "./executeTestCase"
import { TestCase } from "./testCases"

const regressionTests: TestCase[] = [
  {
    cleanFiles: {
      blah: { contents: "\n\n\na\nb\rc\rd\ne\nf\ng\rh\ni\n", mode: 0o644 },
    },
    modifiedFiles: {
      blah: { contents: "z\n\na\nb\rc\rd\ne\nf\ng\rh\ni\n_", mode: 0o644 },
    },
  },
  {
    cleanFiles: {
      blah: { contents: "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nl", mode: 0o644 },
    },
    modifiedFiles: {
      blah: { contents: "d\ne\nf\ng\nh\ni\nj\nk\nm\nl", mode: 0o644 },
    },
  },
  {
    cleanFiles: { b: { contents: "\n", mode: 0o644 } },
    modifiedFiles: { b: { contents: "", mode: 0o644 } },
  },
  {
    cleanFiles: { b: { contents: "", mode: 0o644 } },
    modifiedFiles: { b: { contents: "\n", mode: 0o644 } },
  },
  {
    cleanFiles: { "qc-s.4me": { contents: "a\nl\nb\nG", mode: 0o644 } },
    modifiedFiles: { "qc-s.4me": { contents: "\na\nl\nb\nG", mode: 0o644 } },
  },
  {
    cleanFiles: { banana: { contents: "\r", mode: 0o644 } },
    modifiedFiles: { banana: { contents: "", mode: 0o644 } },
  },
  {
    cleanFiles: { f: { contents: "5\n", mode: 0o644 } },
    modifiedFiles: { f: { contents: "5\n7\n", mode: 0o644 } },
  },
  {
    cleanFiles: { nugs: { contents: "a", mode: 0o644 } },
    modifiedFiles: { nugs: { contents: "a\n\n", mode: 0o644 } },
  },
  {
    cleanFiles: { b: { contents: "\n", mode: 0o644 } },
    modifiedFiles: { b: { contents: "ba\n", mode: 0o644 } },
  },
  {
    cleanFiles: { banana: { contents: "WMo^", mode: 0o644 } },
    modifiedFiles: { banana: { contents: "\n\n", mode: 0o644 } },
  },
  {
    cleanFiles: { b: { contents: "a", mode: 0o644 } },
    modifiedFiles: {
      b: { contents: "a", mode: 0o644 },
      c: { contents: "a\n", mode: 0o644 },
    },
  },
  {
    cleanFiles: {
      "c-qZ0Qznn1.RWOZ": {
        contents: "$xs\rwim\t}pJ(;£BZxc\\bg9k|zvBufcaa",
        mode: 0o644,
      },
      "tK/NEDQ-hff.iaQK": { contents: ";4l", mode: 0o644 },
      "KbYXh8-Dk3J/vcjQ.mz": { contents: "+4:", mode: 0o644 },
      "r6LXXaS/DO3VbFBswE6.WmHQ": {
        contents: "rX]bnT%j+,\t\r~xc&`lLh^\\n*-J$z<4xu",
        mode: 0o644,
      },
      "Fa/lQgW3c/G8LsUj-YFoS.4hoY": { contents: "NS", mode: 0o644 },
    },
    modifiedFiles: {
      "c-qZ0Qznn1.RWOZ": {
        contents: "$xs\rwim\t}pJ(;£BZxc\\bg9k|zvBufcaa",
        mode: 0o644,
      },
      "tK/NEDQ-hff.iaQK": { contents: ";4l", mode: 0o644 },
      "KbYXh8-Dk3J/vcjQ.mz": { contents: "+4:", mode: 0o644 },
      "r6LXXaS/DO3VbFBswE6.WmHQ": { contents: "", mode: 0o644 },
      "Fa/lQgW3c/G8LsUj-YFoS.4hoY": { contents: "NS", mode: 0o644 },
      wW1UMkaGn: { contents: "F", mode: 0o644 },
    },
  },
  {
    cleanFiles: {
      banana: { contents: "M_7P /c$Y%ldTF=o\nKv_caoM|A\rZ^i!+", mode: 0o644 },
    },
    modifiedFiles: {
      banana: {
        contents: "B-§s\r\nM_7P /c$Y%ldTF=o\nKv_caoM|A\rZ^i!+",
        mode: 0o644,
      },
      jimmy: { contents: "", mode: 0o644 },
    },
  },
  {
    cleanFiles: { "QBgzpme/jN/Rvr8SP1gZ.9": { contents: "Zk$@", mode: 0o644 } },
    modifiedFiles: {
      "QBgzpme/jN/Rvr8SP1gZ.9": { contents: ".6f\n7tD*\nZk$@", mode: 0o644 },
    },
  },
  {
    cleanFiles: { "1dkfI.J": { contents: "lineend\n", mode: 0o644 } },
    modifiedFiles: { "1dkfI.J": { contents: "nout", mode: 0o644 } },
  },
  {
    cleanFiles: { "1dkfI.J": { contents: "a\nb\nc", mode: 0o644 } },
    modifiedFiles: { "1dkfI.J": { contents: "b\nb\nc", mode: 0o644 } },
  },
]

describe("regression tests should all pass", () => {
  regressionTests.forEach(executeTestCase)
})
