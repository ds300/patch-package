require("fs").writeFileSync(
  "./package.json",
  JSON.stringify({
    ...require("./package.json"),
    scripts: {
      postinstall: "patch-package",
    },
  }),
)