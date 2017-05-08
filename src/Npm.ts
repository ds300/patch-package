import { execSync as exec } from "child_process"
import { PackageManager } from "./PackageManager"

export default class Npm implements PackageManager {
  constructor(public cwd: string) { }
  public add(packageName: string, version: string) {
    exec(`npm i ${packageName}@${version}`, { cwd: this.cwd })
  }
}
