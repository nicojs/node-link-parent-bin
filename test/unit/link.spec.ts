import path from 'path';
import os from 'os';
import sinon from 'sinon';
import { promises as fs } from 'fs';
import { expect } from 'chai';
import { FSUtils } from './../../src/FSUtils';
import * as link from '../../src/link';
import log4js from 'log4js';
import cmdShim from 'cmd-shim';
import { createLoggerMock } from '../helpers/createLogStub';

describe('link', () => {
  let platform: sinon.SinonStub;
  let symlink: sinon.SinonStub;
  let stat: sinon.SinonStub;
  let cmdShimIfExist: sinon.SinonStub;
  let logStub: sinon.SinonStubbedInstance<log4js.Logger>;

  beforeEach(() => {
    symlink = sinon.stub(fs, 'symlink');
    stat = sinon.stub(fs, 'stat');
    cmdShimIfExist = sinon.stub(cmdShim, 'ifExists');
    sinon.stub(FSUtils, 'mkdirp').resolves(undefined);
    platform = sinon.stub(os, 'platform');
    logStub = createLoggerMock();
    sinon.stub(log4js, 'getLogger').returns(logStub);
  });

  describe('when platform !== win32', () => {
    beforeEach(() => platform.returns('not win32'));

    it('should symlink', async () => {
      stat.rejects();
      const to = 'some/path';
      const expectedResult: link.LinkResult = { status: 'success' };
      const actualResult = await link.link(path.resolve('package.json'), to);
      expect(actualResult).deep.eq(expectedResult);
      expect(fs.symlink).to.have.been.calledWith(
        path.normalize('../package.json'),
        path.resolve(to),
        'junction',
      );
      expect(cmdShimIfExist).not.to.have.been.called;
    });

    it('should reject when `symlink` rejects', () => {
      stat.rejects();
      const err = new Error('some error');
      symlink.rejects(err);
      return expect(
        link.link(path.resolve('package.json'), 'some/link'),
      ).to.be.rejectedWith(err);
    });

    it('should not symlink when a different link `to` already exists', async () => {
      stat.resolves();
      const to = path.resolve('package.json');
      const from = to;
      sinon.stub(fs, 'readlink').resolves('something else');
      const expectedResult: link.LinkResult = {
        status: 'differentLinkAlreadyExists',
      };
      const actualResult = await link.link(from, to);
      expect(actualResult).deep.eq(expectedResult);
      expect(fs.symlink).not.called;
      expect(logStub.debug).calledWith(
        `Different link at '${from}' to '${path.resolve(
          'something else',
        )}' already exists. Leaving it alone, the package is probably already installed in the child package.`,
      );
    });

    it('should not symlink when a same link `to` already exists', async () => {
      stat.resolves();
      const to = path.resolve('package.json');
      const from = to;
      sinon.stub(fs, 'readlink').resolves(to);
      const expectedResult: link.LinkResult = {
        status: 'alreadyExists',
      };
      const actualResult = await link.link(from, to);
      expect(actualResult).deep.eq(expectedResult);
      expect(fs.symlink).not.called;
      expect(logStub.debug).calledWith(
        `Link at '${path.resolve(to)}' already exists.`,
      );
    });
  });

  describe('when platform === win32', () => {
    beforeEach(() => platform.returns('win32'));

    it('should `cmdShim`', async () => {
      // Arrange
      stat.rejects();
      const to = 'some/path';
      const from = path.resolve('package.json');
      cmdShimIfExist.resolves();
      const expectedResult: link.LinkResult = { status: 'success' };

      // Act
      const actualResult = await link.link(from, to);
      expect(actualResult).deep.eq(expectedResult);

      // Assert
      expect(fs.symlink).not.to.have.been.called;
      expect(cmdShimIfExist).calledWith(from, to);
    });

    it('should reject when `cmdShim` errors', () => {
      // Arrange
      stat.rejects();
      const to = 'some/path';
      const from = path.resolve('package.json');
      const err = new Error('some error');
      cmdShimIfExist.rejects(err);

      // Act
      const linkingPromise = link.link(from, to);

      // Assert
      return expect(linkingPromise).rejectedWith(err);
    });

    it('should not create a cmdShim if it already exists', async () => {
      // Arrange
      stat.resolves(); // 'to' exists
      const to = 'some/path';
      const from = path.resolve('package.json');
      const expectedResult: link.LinkResult = { status: 'alreadyExists' };

      // Act
      const actualResult = await link.link(from, to);
      expect(actualResult).deep.eq(expectedResult);

      // Assert
      expect(fs.symlink).not.called;
      expect(cmdShimIfExist).not.called;
      expect(logStub.debug).calledWith(
        `Link at '${to}' already exists. Leaving it alone.`,
      );
    });
  });
});
