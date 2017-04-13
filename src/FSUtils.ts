import * as mkdirp from 'mkdirp';

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
};