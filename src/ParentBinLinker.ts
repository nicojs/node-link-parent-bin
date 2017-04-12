import * as fs from 'mz/fs';
import * as path from 'path';
import { platform } from 'os';
import { getLogger } from 'log4js';
import { linkIfExists, cmdShimIfExists } from './utils';
import { Options } from './program';

const log = getLogger('ParentalControl');

const PACKAGES_DIR = 'packages';

interface Dictionary {
    [name: string]: string;
}

interface PackageJson {
    bin: Dictionary | undefined;
    devDependencies: Dictionary | undefined;
    dependencies: Dictionary | undefined;
}

const readDirs = (location: string) => {
    return fs.readdir(location)
        .then(files => Promise.all(files.map(file => fs.stat(path.resolve(location, file)).then(stat => ({ file, stat }))))
        .then(files => files.filter(f => f.stat.isDirectory()).map(f => f.file)));
}

export class ParentBinLinker {

    constructor(private options: Options) { }

    private linkBin(binName: string, from: string, childPackage: string): Promise<undefined> {
        const to = path.join(PACKAGES_DIR, childPackage, 'node_modules', '.bin', binName);
        log.debug('Creating link at %s for command at %s', to, from);
        if (platform() === 'win32') {
            return cmdShimIfExists(from, to);
        } else {
            return linkIfExists(from, to);
        }
    }

    private linkBinsOfDependencies(childPackages: string[], dependenciesToLink: string[]): Promise<undefined> {
        if (log.isInfoEnabled()) {
            log.info(`Linking dependencies ${JSON.stringify(dependenciesToLink)} under children ${JSON.stringify(childPackages)}`);
        }
        return Promise.all(dependenciesToLink.map(dependency => {
            const moduleDir = path.join('node_modules', dependency);
            const packageFile = path.join('node_modules', dependency, 'package.json');
            return fs.readFile(packageFile)
                .then(content => {
                    const pkg: PackageJson = JSON.parse(content.toString());
                    if (pkg.bin) {
                        return Promise.all(Object.keys(pkg.bin).map(bin => Promise.all(childPackages.map(childPackage =>
                            this.linkBin(bin, path.resolve(moduleDir, pkg.bin[bin]), childPackage)
                                .catch(err => log.error(`Could not link bin ${bin} for child ${childPackage}.`, err))))));
                    } else {
                        log.debug('Did not find a bin in dependency %s, skipping.', dependency);
                        return Promise.resolve(undefined);
                    }
                }).catch(err => log.error(`Could not read ${packageFile}`, err))
        }));
    }

    public linkBins(): Promise<undefined> {
        return Promise.all([fs.readFile('package.json'), readDirs(PACKAGES_DIR)]).then(results => {
            const contents = results[0];
            const childPackages = results[1];
            const pkg: PackageJson = JSON.parse(contents.toString());
            const allPromises: Promise<undefined>[] = [];
            if (pkg.devDependencies && this.options.linkDevDependencies) {
                allPromises.push(this.linkBinsOfDependencies(childPackages, Object.keys(pkg.devDependencies)));
            }
            if (pkg.dependencies && this.options.linkDependencies) {
                allPromises.push(this.linkBinsOfDependencies(childPackages, Object.keys(pkg.dependencies)));
            }
            return Promise.all(allPromises);
        });
    }
}