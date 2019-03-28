const fs = require("fs")

function addPostinstall(packageJsonPath) {
  const json = JSON.parse(fs.readFileSync(packageJsonPath))
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(
      {
        ...json,
        scripts: {
          ...json.scripts,
          postinstall: "yarn patch-package",
        },
      },
      null,
      "  ",
    ),
  )
}

Array.prototype.slice
  .call(process.argv, 2)
  .filter(x => !x.match(/node_modules/))
  .map(addPostinstall)
