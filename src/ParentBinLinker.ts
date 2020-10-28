import * as fs from 'mz/fs';
import * as path from 'path';
import * as log4js from 'log4js';
import * as link from './link';
import * as minimatch from 'minimatch';
import { Options } from './program';
import { FSUtils } from './FSUtils';

export interface Dictionary {
  [name: string]: string;
}

export interface PackageJson {
  name?: string;
  bin?: Dictionary | string;
  devDependencies?: Dictionary;
  dependencies?: Dictionary;
  localDependencies?: Dictionary;
}

export class ParentBinLinker {
  public log: log4js.Logger;

  constructor(private options: Options) {
    this.log = log4js.getLogger('ParentBinLinker');
  }

  private async linkBin(
    binName: string,
    from: string,
    childPackage: string,
  ): Promise<void> {
    const to = path.join(
      this.options.childDirectoryRoot,
      childPackage,
      'node_modules',
      '.bin',
      binName,
    );
    this.log.debug('Creating link at %s for command at %s', to, from);
    await link.link(from, to);
    return void 0;
  }

  private async linkBinsOfDependencies(
    childPackages: string[],
    dependenciesToLink: string[],
  ): Promise<void> {
    if (this.log.isInfoEnabled()) {
      this.log.info(
        `Linking dependencies ${JSON.stringify(
          dependenciesToLink,
        )} under children ${JSON.stringify(childPackages)}`,
      );
    }

    await Promise.all(
      dependenciesToLink.map(async (dependency) => {
        const moduleDir = path.join('node_modules', dependency);
        const packageFile = path.join(
          'node_modules',
          dependency,
          'package.json',
        );
        try {
          const content = await fs.readFile(packageFile);
          const pkg: PackageJson = JSON.parse(content.toString());
          if (pkg.bin) {
            const binaries = this.binariesFrom(pkg);
            return Promise.all(
              Object.keys(binaries).map((bin) =>
                Promise.all(
                  childPackages.map((childPackage) =>
                    this.linkBin(
                      bin,
                      path.resolve(moduleDir, binaries[bin]),
                      childPackage,
                    ).catch((err) =>
                      this.log.error(
                        `Could not link bin ${bin} for child ${childPackage}.`,
                        err,
                      ),
                    ),
                  ),
                ),
              ),
            );
          } else {
            this.log.debug(
              'Did not find a bin in dependency %s, skipping.',
              dependency,
            );
          }
        } catch (err) {
          return this.log.error(`Could not read ${packageFile}`, err);
        }
      }),
    );
    return void 0;
  }

  public async linkBinsToChildren(): Promise<void> {
    const [contents, childPackages] = await Promise.all([
      fs.readFile('package.json'),
      FSUtils.readDirs(this.options.childDirectoryRoot).then((dirs) =>
        dirs.filter(minimatch.filter(this.options.filter)),
      ),
    ]);
    const pkg: PackageJson = JSON.parse(contents.toString());
    const allPromises: Promise<void>[] = [];
    if (pkg.devDependencies && this.options.linkDevDependencies) {
      allPromises.push(
        this.linkBinsOfDependencies(
          childPackages,
          Object.keys(pkg.devDependencies),
        ),
      );
    }
    if (pkg.dependencies && this.options.linkDependencies) {
      allPromises.push(
        this.linkBinsOfDependencies(
          childPackages,
          Object.keys(pkg.dependencies),
        ),
      );
    }
    if (pkg.localDependencies && this.options.linkLocalDependencies) {
      allPromises.push(
        this.linkBinsOfDependencies(
          childPackages,
          Object.keys(pkg.localDependencies),
        ),
      );
    }
    await Promise.all(allPromises);
  }

  private binariesFrom(pkg: PackageJson): Dictionary {
    const isString = (val: unknown): val is string => typeof val === 'string';

    return isString(pkg.bin) ? { [pkg.name]: pkg.bin } : pkg.bin;
  }
}
