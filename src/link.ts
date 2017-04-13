import { platform } from 'os';
import * as path from 'path';
import * as fs from 'mz/fs';
const cmdShim = require('cmd-shim');

import { FSUtils } from './FSUtils';

function symlink(from: string, to: string) {
    to = path.resolve(to)
    const toDir = path.dirname(to)
    const target = path.relative(toDir, from)
    return FSUtils.mkdirp(path.dirname(to))
        .then(() => fs.symlink(target, to, 'junction'));
}

export function link(from: string, to: string) {
    if (platform() === 'win32') {
        return cmdShimIfExists(from, to);
    } else {
        return linkIfExists(from, to);
    }
}

function cmdShimIfExists(from: string, to: string): Promise<void> {
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
                    return symlink(from, to);
                }
            })
        ).catch(_ => /* link doesn't exist */ symlink(from, to));
}
