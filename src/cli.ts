import { ParentBinLinker } from './ParentBinLinker';
import { program } from './program';
import * as log4js from 'log4js';

const options = program.parse(process.argv);
log4js.configure({
  appenders: {
    console: {
      type: 'stdout',
      layout: { type: 'pattern', pattern: '%[%r (%z) %p %c%] %m' },
    },
  },
  categories: {
    default: { appenders: ['console'], level: options.logLevel },
  },
});

new ParentBinLinker(options).linkBinsToChildren().catch((err) => {
  console.error('Error Linking packages', err);
  process.exit(1);
});
