import * as log4js from 'log4js';
log4js.configure({
    appenders: {
        console: { type: 'stdout' }
    },
    categories: {
        default: { appenders: ['console'], level: 'fatal' }
    }
});