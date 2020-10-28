import sinon from 'sinon';
import { Logger } from 'log4js';

export function createLoggerMock(): sinon.SinonStubbedInstance<Logger> {
  return {
    debug: sinon.stub(),
    error: sinon.stub(),
    fatal: sinon.stub(),
    info: sinon.stub(),
    isDebugEnabled: sinon.stub(),
    isErrorEnabled: sinon.stub(),
    isFatalEnabled: sinon.stub(),
    isInfoEnabled: sinon.stub(),
    clearContext: sinon.stub(),
    isLevelEnabled: sinon.stub(),
    isTraceEnabled: sinon.stub(),
    isWarnEnabled: sinon.stub(),
    log: sinon.stub(),
  } as sinon.SinonStubbedInstance<Logger>;
}
