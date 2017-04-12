import * as fs from 'mz/fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
const cmdShim = require('cmd-shim');

const mkdir = (dir: string) => new Promise((res, rej) => {
    mkdirp(dir, err => {
        if (err) {
            rej(err);
        } else {
            res();
        }
    })
});

function link(from: string, to: string) {
    to = path.resolve(to)
    const toDir = path.dirname(to)
    const target = path.relative(toDir, from)
    console.log('Symlink:', target, to);
    return mkdir(path.dirname(to))
        .then(_ => fs.symlink(target, to, 'junction'));
}

export function cmdShimIfExists(from: string, to: string): Promise<void> {
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

export function linkIfExists(from: string, to: string) {
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
                    return link(from, to);
                }
            })
        ).catch(_ => /* link doesn't exist */ link(from, to));
}
