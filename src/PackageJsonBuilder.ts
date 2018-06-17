import { resolve } from "./path"

export interface IPackageJson extends Object {
  name: string
  dependencies?: IDependencyMap
  devDependencies?: IDependencyMap
}

interface IDependencyMap {
  [packageName: string]: string
}

export class PackageJsonBuilder {
  private basePath?: string = undefined

  private name: string = ""
  private dependencies: IDependencyMap = {}
  private devDependencies: IDependencyMap = {}

  constructor(base?: IPackageJson) {
    if (base) {
      this.name = base.name
      this.dependencies = Object.assign({}, base.dependencies)
      this.devDependencies = Object.assign({}, base.devDependencies)
    }
  }

  public withName(name: string) {
    this.name = name
    return this
  }

  public withDependency(name: string, version: string) {
    this.dependencies[name] = version
    return this
  }

  public withDevDependency(name: string, version: string) {
    this.devDependencies[name] = version
    return this
  }

  public relativeTo(path: string) {
    this.basePath = path
    return this
  }

  public build(): IPackageJson {
    const result: IPackageJson = {
      name: this.name,
    }

    if (this.dependencies) {
      result.dependencies = this.basePath
        ? this.transformVersionStrings(this.dependencies, this.basePath)
        : this.dependencies
    }

    if (this.devDependencies) {
      result.devDependencies = this.basePath
        ? this.transformVersionStrings(this.devDependencies, this.basePath)
        : this.devDependencies
    }
    return result
  }

  private transformVersionStrings(
    dependencies: IDependencyMap,
    basePath: string,
  ) {
    return Object.keys(dependencies).reduce<IDependencyMap>((previous, key) => {
      const version = dependencies[key]
      previous[key] =
        version.startsWith("file:") && version[5] !== "/"
          ? "file:" + resolve(basePath, version.slice(5))
          : version
      return previous
    }, {})
  }
}
