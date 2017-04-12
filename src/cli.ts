import { ParentBinLinker } from './ParentBinLinker';
import { program } from './program';
import * as log4js from 'log4js';

const options = program.parse(process.argv);
log4js.setGlobalLogLevel(options.logLevel);

new ParentBinLinker(options).linkBins()
    .catch(err => {
        console.error('Error Linking packages', err);
        process.exit(1);
    });