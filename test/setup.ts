import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import log4js from 'log4js';
import sinon from 'sinon';

log4js.configure({
  appenders: {
    console: { type: 'stdout' },
  },
  categories: {
    default: { appenders: ['console'], level: 'fatal' },
  },
});

chai.use(chaiAsPromised);
chai.use(sinonChai);

export const mochaHooks = {
  afterEach(): void {
    sinon.restore();
  },
};
