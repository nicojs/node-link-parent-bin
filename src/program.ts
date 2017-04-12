import * as commander from 'commander';

export interface Options {
    linkDevDependencies: boolean;
    linkDependencies: boolean;
    logLevel: 'debug' | 'info' | 'error';
}

const parseBoolean = (val: string) => val.toLowerCase() === 'true';
const describeLinking = (name: string, defaultValue: boolean) => `Enables linking of parents \`${name}\`. Defaults to: ${defaultValue}`;

const cliProgram = commander
  .version(require('../package.json').version)
  .option('-d, --link-dev-dependencies <true|false>', describeLinking('devDependencies', true), parseBoolean, true)
  .option('-s, --link-dependencies <true|false>', describeLinking('dependencies', false), parseBoolean, false)
  .option('-l, --logLevel <debug|info|error>', 'Set the log level', /debug|info|error/, 'info');

export const program = {
    parse: (argv: string[]) => (cliProgram.parse(argv) as any) as Options
} 