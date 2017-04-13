import { Options } from './program';
import * as commander from 'commander';

export interface Options {
    linkDevDependencies: boolean;
    linkDependencies: boolean;
    logLevel: 'debug' | 'info' | 'error';
    childDirectoryRoot: string;
}

const parseBoolean = (val: string) =>  val.toLowerCase() === 'true';
const describeLinking = (name: string, defaultValue: boolean) => `Enables linking of parents \`${name}\`. Defaults to: ${defaultValue}`;

export const program = {
    parse: (argv: string[]) => {
        return (commander
            .usage('[options]')
            .version(require('../package.json').version)
            .option('-c, --child-directory-root <child-directory>', 'The directory that hosts the child packages relative to the parent root.', 'packages')
            .option('-d, --link-dev-dependencies <true|false>', describeLinking('devDependencies', true), parseBoolean, true)
            .option('-s, --link-dependencies <true|false>', describeLinking('dependencies', false), parseBoolean, false)
            .option('-l, --log-level <debug|info|error>', 'Set the log level', /debug|info|error/, 'info')
            .parse(argv) as any) as Options;
    }
} 