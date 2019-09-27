import * as mkdirp from 'mkdirp';
import * as fs from 'mz/fs';
import * as path from 'path';
import * as minimatch from 'minimatch';

export class FSUtils {
    static mkdirp(dir: string): Promise<undefined> {
        return new Promise((res, rej) => {
            mkdirp(dir, err => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            })
        });
    }

    static readDirs = (location: string, pattern: string) => {
        return fs.readdir(location)
            .then(files => Promise.all(files.map(file => fs.stat(path.resolve(location, file)).then(stat => ({ file, stat }))))
                .then(files => files.filter(f => f.stat.isDirectory() && minimatch(f.file, pattern)).map(f => f.file)));
    }
};