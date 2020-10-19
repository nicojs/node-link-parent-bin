import { Command } from 'commander';

export interface Options {
  linkDevDependencies: boolean;
  linkDependencies: boolean;
  linkLocalDependencies: boolean;
  logLevel: 'debug' | 'info' | 'error';
  childDirectoryRoot: string;
}

const parseBoolean = (val: string) => val.toLowerCase() === 'true';
const describeLinking = (name: string, defaultValue: boolean) =>
  `Enables linking of parents \`${name}\`. Defaults to: ${defaultValue}`;

export const program = {
  parse(argv: string[]): Options {
    const program = new Command();
    return (
      program
        .storeOptionsAsProperties(false)
        .usage('[options]')
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .version(require('../../package.json').version)
        .option(
          '-c, --child-directory-root <child-directory>',
          'The directory that hosts the child packages relative to the parent root.',
          'packages',
        )
        .option(
          '-d, --link-dev-dependencies <true|false>',
          describeLinking('devDependencies', true),
          parseBoolean,
          true,
        )
        .option(
          '-s, --link-dependencies <true|false>',
          describeLinking('dependencies', false),
          parseBoolean,
          false,
        )
        .option(
          '-o, --link-local-dependencies <true|false>',
          describeLinking('localDependencies', false),
          parseBoolean,
          false,
        )
        .option(
          '-l, --log-level <debug|info|error|off>',
          'Set the log level',
          /debug|info|error|off/,
          'info',
        )
        .parse(argv)
        .opts() as Options
    );
  },
};
