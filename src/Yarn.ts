import { execSync as exec } from "child_process"
import { PackageManager } from "./PackageManager"

export default class Yarn implements PackageManager {
  constructor(public cwd: string) { }
  public install() {
    exec(`yarn`, { cwd: this.cwd })
  }
}
