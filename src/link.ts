import { platform } from 'os';
import path from 'path';
import { getLogger } from 'log4js';
import { promises as fs } from 'fs';
import { FSUtils } from './FSUtils';
import cmdShim from 'cmd-shim';

async function symlink(from: string, to: string) {
  to = path.resolve(to);
  const toDir = path.dirname(to);
  const target = path.relative(toDir, from);
  await FSUtils.mkdirp(path.dirname(to));
  return await fs.symlink(target, to, 'junction');
}

export async function link(from: string, to: string): Promise<void> {
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
      cmdShim.ifExists(from, to, (err: unknown) => {
        if (err) {
          rej(err);
        } else {
          res(undefined);
        }
      });
    });
  }
}

async function linkIfExists(from: string, to: string): Promise<void> {
  try {
    await fs.stat(from);
    const fromOnDisk = await fs.readlink(to);
    const toDir = path.dirname(to);
    const absoluteFrom = path.resolve(toDir, from);
    const absoluteFromOnDisk = path.resolve(toDir, fromOnDisk);
    if (absoluteFrom !== absoluteFromOnDisk) {
      info(
        `Different link at '${to}' already exists. Leaving it alone, the package is probably already installed in the child package.`,
      );
    }
  } catch {
    return symlink(from, to);
  }
}

function info(message: string, ...args: unknown[]) {
  const log = getLogger('link');
  log.info(message, ...args);
}
