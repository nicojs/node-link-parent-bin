import { platform } from 'os';
import path from 'path';
import { getLogger } from 'log4js';
import { promises as fs } from 'fs';
import { FSUtils } from './FSUtils';
import cmdShim from 'cmd-shim';

export type LinkStatus =
  | 'success'
  | 'alreadyExists'
  | 'differentLinkAlreadyExists'
  | 'error';

export interface LinkResult {
  status: LinkStatus;
}

async function symlink(from: string, to: string): Promise<LinkResult> {
  to = path.resolve(to);
  const toDir = path.dirname(to);
  const target = path.relative(toDir, from);
  await FSUtils.mkdirp(path.dirname(to));
  await fs.symlink(target, to, 'junction');
  return {
    status: 'success',
  };
}

export async function link(from: string, to: string): Promise<LinkResult> {
  if (platform() === 'win32') {
    return cmdShimIfExists(from, to);
  } else {
    return linkIfExists(from, to);
  }
}

async function cmdShimIfExists(from: string, to: string): Promise<LinkResult> {
  try {
    await fs.stat(to);
    debug(`Link at '${to}' already exists. Leaving it alone.`);
    return { status: 'alreadyExists' };
  } catch (_) {
    /* link doesn't exist */
    await cmdShim.ifExists(from, to);
    return { status: 'success' };
  }
}

async function linkIfExists(from: string, to: string): Promise<LinkResult> {
  try {
    await fs.stat(from);
    const fromOnDisk = await fs.readlink(to);
    const toDir = path.dirname(to);
    const absoluteFrom = path.resolve(toDir, from);
    const absoluteFromOnDisk = path.resolve(toDir, fromOnDisk);
    if (absoluteFrom !== absoluteFromOnDisk) {
      debug(
        `Different link at '${to}' to '${absoluteFromOnDisk}' already exists. Leaving it alone, the package is probably already installed in the child package.`,
      );
      return {
        status: 'differentLinkAlreadyExists',
      };
    } else {
      debug(`Link at '${to}' already exists.`);
      return {
        status: 'alreadyExists',
      };
    }
  } catch {
    return symlink(from, to);
  }
}

function debug(message: string, ...args: unknown[]) {
  const log = getLogger('link');
  log.debug(message, ...args);
}
