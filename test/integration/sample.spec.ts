import { expect } from 'chai';
import fs from 'fs';
import execa = require('execa');
import path from 'path';
import rimraf from 'rimraf';
import semver from 'semver';

const rm = (location: string) =>
  new Promise<void>((res, rej) =>
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
      .then(() =>
        execInSample(
          'npx link-parent-bin --log-level debug -s true -o true --filter child-1',
        ),
      ),
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

  it('should support scoped packages', async () => {
    const result = await execInSample('npm run hello-org', 'packages/child-1');
    expect(result.stdout).contains('hello org');
  });

  it('should not link in ignored patterns', async () => {
    const version = (await execa('npm', ['-v'])).stdout;
    if (semver.gte(version, '8.0.0')) {
      await execInSample('npm run hello-dependency', 'packages/ignored');
      expect(
        fs.existsSync(
          resolve('packages/ignored/node_modules/.bin/helloDependency'),
        ),
      ).false;
    } else {
      await expect(execInSample('npm run hello-dependency', 'packages/ignored'))
        .rejected;
    }
  });
});
