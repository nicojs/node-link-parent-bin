import * as mkdirp from 'mkdirp';
import * as fs from 'mz/fs';
import * as path from 'path';

export class FSUtils {
  static mkdirp = mkdirp;

  static readDirs = async (location: string): Promise<string[]> => {
    const files = await fs.readdir(location);
    const filesWithStats = await Promise.all(
      files.map((name) =>
        fs.stat(path.resolve(location, name)).then((stat) => ({ name, stat })),
      ),
    );
    return filesWithStats
      .filter((f) => f.stat.isDirectory())
      .map(({ name: file }) => file);
  };
}
