import { execSync as exec } from "child_process"
import { PackageManager } from "./PackageManager"

export default class Npm implements PackageManager {
  constructor(public cwd: string) { }
  public install() {
    exec(`npm i`, { cwd: this.cwd })
  }
}
