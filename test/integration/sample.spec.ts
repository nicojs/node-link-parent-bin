import { expect } from 'chai';
import execa = require('execa');
import * as path from 'path';
import * as rimraf from 'rimraf';

const rm = (location: string) =>
  new Promise((res, rej) =>
    rimraf(location, (err) => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    }),
  );

const resolve = (relativePath: string) =>
  path.resolve(__dirname, '../../../sample', relativePath);

const execInSample = async (
  cmd: string,
  cwd = '',
): Promise<execa.ExecaReturnValue<string>> => {
  console.log(`exec: ${cmd}`);
  const output = await execa.command(cmd, { cwd: resolve(cwd) });
  if (output.stdout) {
    console.log(`stdout: ${output.stdout}`);
  }
  if (output.stderr) {
    console.error(`stderr: ${output.stderr}`);
  }

  return output;
};

const MOCHA_TIMEOUT = 60000;

describe('Sample project after installing and linking with `link-parent-bin`', function () {
  this.timeout(MOCHA_TIMEOUT);

  before(() =>
    rm(resolve('node_modules'))
      .then(() => execInSample('npm i'))
      .then(() => execInSample('npm run link-parent-bin')),
  );

  it('should be able to run linked dependency commands from child packages', () => {
    return expect(execInSample('npm run hello-dependency', 'packages/child-1'))
      .to.eventually.have.property('stdout')
      .and.match(/hello dependency/g);
  });

  it('should be able to run a linked dev dependency', () => {
    return expect(
      execInSample('npm run hello-dev-dependency', 'packages/child-1'),
    )
      .to.eventually.have.property('stdout')
      .and.match(/hello dev dependency/g);
  });

  it('should be able to run a linked local dependency', () => {
    return expect(
      execInSample('npm run link-parent-bin-help', 'packages/child-1'),
    )
      .to.eventually.have.property('stdout')
      .and.match(/Usage: link-parent-bin/g);
  });

  it('should be able to run a dependency with a single binary', () => {
    return expect(
      execInSample(
        'npm run hello-single-binary-dependency',
        'packages/child-1',
      ),
    )
      .to.eventually.have.property('stdout')
      .and.match(/hello single-binary-dependency/g);
  });

  it('should proxy the exit code when the process fails', async () => {
    const result = await expect(
      execInSample('npm run fail-now', 'packages/child-1'),
    ).rejected;
    expect(result.exitCode).eq(3);
    expect(result.stdout).contains('Fail now!');
  });
});
