import { promises as fs } from 'fs';
import path from 'path';
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
  ): Promise<link.LinkResult> {
    const to = path.join(
      this.options.childDirectoryRoot,
      childPackage,
      'node_modules',
      '.bin',
      binName,
    );
    this.log.debug('Creating link at %s for command at %s', to, from);
    return link.link(from, to);
  }

  private async linkBinsOfDependencies(
    childPackages: string[],
    dependenciesToLink: string[],
  ): Promise<link.LinkResult[]> {
    if (this.log.isInfoEnabled()) {
      this.log.info(
        `Linking dependencies ${JSON.stringify(
          dependenciesToLink,
        )} under children ${JSON.stringify(childPackages)}`,
      );
    }

    const results = await Promise.all(
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
            const binaries = this.binariesFrom(pkg, pkg.bin);
            const linkResultArrays = await Promise.all(
              Object.keys(binaries).map((bin) =>
                Promise.all(
                  childPackages.map((childPackage) =>
                    this.linkBin(
                      bin,
                      path.resolve(moduleDir, binaries[bin]),
                      childPackage,
                    ).catch((err) => {
                      this.log.error(
                        `Could not link bin ${bin} for child ${childPackage}.`,
                        err,
                      );
                      const result: link.LinkResult = { status: 'error' };
                      return result;
                    }),
                  ),
                ),
              ),
            );
            return flatten(linkResultArrays);
          } else {
            this.log.debug(
              'Did not find a bin in dependency %s, skipping.',
              dependency,
            );
            return [];
          }
        } catch (err) {
          this.log.error(`Could not read ${packageFile}`, err);
          return [];
        }
      }),
    );
    return flatten(results);
  }

  public async linkBinsToChildren(): Promise<link.LinkResult[]> {
    const [contents, childPackages] = await Promise.all([
      fs.readFile('package.json'),
      FSUtils.readDirs(this.options.childDirectoryRoot).then((dirs) =>
        dirs.filter(minimatch.filter(this.options.filter)),
      ),
    ]);
    const pkg: PackageJson = JSON.parse(contents.toString());
    const allPromises: Promise<link.LinkResult[]>[] = [];
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
    const resultArrays = await Promise.all(allPromises);
    const results = flatten(resultArrays);
    const {
      successCount,
      differentLinkAlreadyExistsCount,
      alreadyExistsCount,
      errorCount,
    } = summary(results);
    this.log.info(
      `Symlinked ${successCount} bin(s) (${alreadyExistsCount} link(s) already exists, ${differentLinkAlreadyExistsCount} different link(s) already exists, ${errorCount} error(s)). Run with debug log level for more info.`,
    );
    return results;
  }

  private binariesFrom(
    pkg: { name?: string },
    bin: Dictionary | string,
  ): Dictionary {
    return typeof bin === 'string' ? { [pkg.name ?? '']: bin } : bin;
  }
}

function summary(linkResults: link.LinkResult[]) {
  let successCount = 0;
  let errorCount = 0;
  let alreadyExistsCount = 0;
  let differentLinkAlreadyExistsCount = 0;
  for (const { status } of linkResults) {
    switch (status) {
      case 'success':
        successCount++;
        break;
      case 'alreadyExists':
        alreadyExistsCount++;
        break;
      case 'differentLinkAlreadyExists':
        differentLinkAlreadyExistsCount++;
        break;
      case 'error':
        errorCount++;
        break;
    }
  }
  return {
    successCount,
    errorCount,
    alreadyExistsCount,
    differentLinkAlreadyExistsCount,
  };
}

function flatten<T>(arrayOfArrays: T[][]): T[] {
  return arrayOfArrays.reduce((result, arr) => [...result, ...arr], []);
}
