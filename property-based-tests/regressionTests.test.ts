import { executeTestCase } from "./executeTestCase"

describe("regression tests", () => {
  describe("0", () => {
    executeTestCase({
      cleanFiles: {
        blah: { contents: "\n\n\na\nb\rc\rd\ne\nf\ng\rh\ni\n", mode: 420 },
      },
      modifiedFiles: {
        blah: { contents: "z\n\na\nb\rc\rd\ne\nf\ng\rh\ni\n_", mode: 420 },
      },
    })
  })

  describe("1", () => {
    executeTestCase({
      cleanFiles: {
        blah: { contents: "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nl", mode: 420 },
      },
      modifiedFiles: {
        blah: { contents: "d\ne\nf\ng\nh\ni\nj\nk\nm\nl", mode: 420 },
      },
    })
  })

  describe("2", () => {
    executeTestCase({
      cleanFiles: { b: { contents: "\n", mode: 420 } },
      modifiedFiles: { b: { contents: "", mode: 420 } },
    })
  })

  describe("3", () => {
    executeTestCase({
      cleanFiles: { b: { contents: "", mode: 420 } },
      modifiedFiles: { b: { contents: "\n", mode: 420 } },
    })
  })

  describe("4", () => {
    executeTestCase({
      cleanFiles: { "qc-s.4me": { contents: "a\nl\nb\nG", mode: 420 } },
      modifiedFiles: { "qc-s.4me": { contents: "\na\nl\nb\nG", mode: 420 } },
    })
  })

  describe("5", () => {
    executeTestCase({
      cleanFiles: { banana: { contents: "\r", mode: 420 } },
      modifiedFiles: { banana: { contents: "", mode: 420 } },
    })
  })

  describe("6", () => {
    executeTestCase({
      cleanFiles: { f: { contents: "5\n", mode: 420 } },
      modifiedFiles: { f: { contents: "5\n7\n", mode: 420 } },
    })
  })

  describe("7", () => {
    executeTestCase({
      cleanFiles: { nugs: { contents: "a", mode: 420 } },
      modifiedFiles: { nugs: { contents: "a\n\n", mode: 420 } },
    })
  })

  describe("8", () => {
    executeTestCase({
      cleanFiles: { b: { contents: "\n", mode: 420 } },
      modifiedFiles: { b: { contents: "ba\n", mode: 420 } },
    })
  })

  describe("9", () => {
    executeTestCase({
      cleanFiles: { banana: { contents: "WMo^", mode: 420 } },
      modifiedFiles: { banana: { contents: "\n\n", mode: 420 } },
    })
  })

  describe("10", () => {
    executeTestCase({
      cleanFiles: { b: { contents: "a", mode: 420 } },
      modifiedFiles: {
        b: { contents: "a", mode: 420 },
        c: { contents: "a\n", mode: 420 },
      },
    })
  })

  describe("11", () => {
    executeTestCase({
      cleanFiles: {
        "c-qZ0Qznn1.RWOZ": {
          contents: "$xs\rwim\t}pJ(;£BZxc\\bg9k|zvBufcaa",
          mode: 420,
        },
        "tK/NEDQ-hff.iaQK": { contents: ";4l", mode: 420 },
        "KbYXh8-Dk3J/vcjQ.mz": { contents: "+4:", mode: 420 },
        "r6LXXaS/DO3VbFBswE6.WmHQ": {
          contents: "rX]bnT%j+,\t\r~xc&`lLh^\\n*-J$z<4xu",
          mode: 420,
        },
        "Fa/lQgW3c/G8LsUj-YFoS.4hoY": { contents: "NS", mode: 420 },
      },
      modifiedFiles: {
        "c-qZ0Qznn1.RWOZ": {
          contents: "$xs\rwim\t}pJ(;£BZxc\\bg9k|zvBufcaa",
          mode: 420,
        },
        "tK/NEDQ-hff.iaQK": { contents: ";4l", mode: 420 },
        "KbYXh8-Dk3J/vcjQ.mz": { contents: "+4:", mode: 420 },
        "r6LXXaS/DO3VbFBswE6.WmHQ": { contents: "", mode: 420 },
        "Fa/lQgW3c/G8LsUj-YFoS.4hoY": { contents: "NS", mode: 420 },
        wW1UMkaGn: { contents: "F", mode: 420 },
      },
    })
  })

  describe("12", () => {
    executeTestCase({
      cleanFiles: {
        banana: { contents: "M_7P /c$Y%ldTF=o\nKv_caoM|A\rZ^i!+", mode: 420 },
      },
      modifiedFiles: {
        banana: {
          contents: "B-§s\r\nM_7P /c$Y%ldTF=o\nKv_caoM|A\rZ^i!+",
          mode: 420,
        },
        jimmy: { contents: "", mode: 420 },
      },
    })
  })

  describe("13", () => {
    executeTestCase({
      cleanFiles: { "QBgzpme/jN/Rvr8SP1gZ.9": { contents: "Zk$@", mode: 420 } },
      modifiedFiles: {
        "QBgzpme/jN/Rvr8SP1gZ.9": { contents: ".6f\n7tD*\nZk$@", mode: 420 },
      },
    })
  })

  describe("14", () => {
    executeTestCase({
      cleanFiles: { "1dkfI.J": { contents: "lineend\n", mode: 420 } },
      modifiedFiles: { "1dkfI.J": { contents: "nout", mode: 420 } },
    })
  })

  describe("15", () => {
    executeTestCase({
      cleanFiles: { "1dkfI.J": { contents: "a\nb\nc", mode: 420 } },
      modifiedFiles: { "1dkfI.J": { contents: "b\nb\nc", mode: 420 } },
    })
  })

  describe("16", () => {
    executeTestCase({
      cleanFiles: {
        "k/1dt4myqe.e1": {
          contents: "a\n\n\n\nbanana\n",
          mode: 420,
        },
      },
      modifiedFiles: {
        "k/1dt4myqe.e1": {
          contents: "b\n\n\n\nbanana\n",
          mode: 420,
        },
      },
    })
  })

  describe("17", () => {
    executeTestCase({
      cleanFiles: {
        abc: { contents: "E\n", mode: 420 },
      },
      modifiedFiles: { cpz: { contents: "E\n", mode: 420 } },
    })
  })
})
