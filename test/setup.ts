import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import * as log4js from 'log4js';
import * as sinon from 'sinon';

log4js.configure({
    appenders: {
        console: { type: 'stdout' }
    },
    categories: {
        default: { appenders: ['console'], level: 'fatal' }
    }
});

chai.use(chaiAsPromised);
chai.use(sinonChai);

export const mochaHooks = {
    afterEach() {
        sinon.restore();
    }
}