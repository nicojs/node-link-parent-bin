import { platform } from 'os';
import * as path from 'path';
import { getLogger } from 'log4js';
import * as fs from 'mz/fs';
import { FSUtils } from './FSUtils';

const cmdShim = require('cmd-shim');

function symlink(from: string, to: string) {
    to = path.resolve(to)
    const toDir = path.dirname(to)
    const target = path.relative(toDir, from)
    return FSUtils.mkdirp(path.dirname(to))
        .then(() => fs.symlink(target, to, 'junction'));
}

export async function link(from: string, to: string) {
    if (platform() === 'win32') {
        return cmdShimIfExists(from, to);
    } else {
        return linkIfExists(from, to);
    }
}

async function cmdShimIfExists(from: string, to: string): Promise<void> {
    try {
        await fs.stat(to);
        info(`Link at '${to}' already exists. Leaving it alone.`);
    } catch (_) {
        /* link doesn't exist */
        return new Promise<void>((res, rej) => {
            cmdShim.ifExists(from, to, (err: any) => {
                if (err) {
                    rej(err);
                } else {
                    res(undefined);
                }
            });
        });
    }
}

function linkIfExists(from: string, to: string) {
    return fs.stat(from)
        .then(_ => fs.readlink(to)
            .then(fromOnDisk => {
                const toDir = path.dirname(to);
                const absoluteFrom = path.resolve(toDir, from);
                const absoluteFromOnDisk = path.resolve(toDir, fromOnDisk);
                if (absoluteFrom === absoluteFromOnDisk) {
                    // if the link already exists and matches what we would do,
                    // we don't need to do anything
                    return undefined;
                } else {
                    info(`Different link at '${to}' already exists. Leaving it alone, the package is probably already installed in the child package.`);
                }
            })
        ).catch(_ => {
            /* link doesn't exist */
            return symlink(from, to);
        });
}

function info(message: string, ...args: any[]) {
    const log = getLogger('link');
    log.info(message, ...args);
}