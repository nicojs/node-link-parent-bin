import { expect } from 'chai';
import * as childProcess from 'mz/child_process';
import * as path from 'path';
import * as rimraf from 'rimraf';

const rm = (location: string) => new Promise((res, rej) => rimraf(location, err => {
    if (err) {
        rej(err);
    } else {
        res();
    }
}));

const resolve = (relativePath: string) => path.resolve(__dirname, '../../sample', relativePath);

const execInSample = (cmd: string, cwd = '') => {
    console.log(`exec: ${cmd}`);
    return childProcess.exec(cmd, { cwd: resolve(cwd) }).then(output => {
        const stdout = output[0].toString();
        const stderr = output[1].toString();
        if (stdout) {
            console.log(`stdout: ${stdout}`);
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        return { stdout, stderr };
    });
}

const MOCHA_TIMEOUT = 60000;

describe('Sample project after installing and linking with `link-parent-bin`', function () {

    this.timeout(MOCHA_TIMEOUT);

    before(() => rm(resolve('node_modules'))
        .then(() => execInSample('npm i'))
        .then(() => execInSample('npm run link-parent-bin')));

    it('should be able to run linked dependency commands from child packages', () => {
        return expect(execInSample('npm run hello-dependency', 'packages/child-1')).to.eventually.have.property('stdout').and.match(/hello dependency/g);
    });

    it('should be able to run a linked dev dependency', () => {
        return expect(execInSample('npm run hello-dev-dependency', 'packages/child-1')).to.eventually.have.property('stdout').and.match(/hello dev dependency/g);
    });

    it('should be able to run a linked local dependency', () => {
        return expect(execInSample('npm run link-parent-bin-help', 'packages/child-1')).to.eventually.have.property('stdout').and.match(/Usage: link-parent-bin/g);
    });
})