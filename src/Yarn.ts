import { execSync as exec } from "child_process"
import { PackageManager } from "./PackageManager"

export default class Yarn implements PackageManager {
  constructor(public cwd: string) { }
  public add(packageName: string, version: string) {
    exec(`yarn add ${packageName}@${version}`, { cwd: this.cwd })
  }
}
