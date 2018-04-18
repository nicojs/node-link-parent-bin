import * as path from 'path';
import * as fs from 'mz/fs';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Options } from './../../src/program';
import { FSUtils } from './../../src/FSUtils';
import * as link from './../../src/link';
import { ParentBinLinker, PackageJson } from './../../src/ParentBinLinker';

describe('ParentBinLinker', () => {

    let sandbox: sinon.SinonSandbox;
    let readFileStub: sinon.SinonStub;
    let linkStub: sinon.SinonStub;
    let readDirsStub: sinon.SinonStub;
    let sut: ParentBinLinker;
    let options: Options;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        options = {
            linkDependencies: false,
            linkDevDependencies: true,
            linkLocalDependencies: false,
            logLevel: 'info',
            childDirectoryRoot: 'packages'
        };
        sut = new ParentBinLinker(options);
        readDirsStub = sandbox.stub(FSUtils, 'readDirs');
        readFileStub = sandbox.stub(fs, 'readFile');
        linkStub = sandbox.stub(link, 'link');
    });

    afterEach(() => sandbox.restore());

    describe('linkBinsToChildren', () => {

        it('should reject when `readFile` rejects', () => {
            const error = new Error('some error');
            readDirsStub.resolves([]);
            readFileStub.rejects(error);
            return expect(sut.linkBinsToChildren()).to.rejectedWith(error);
        });

        it('should reject when `readDir` rejects', () => {
            const error = new Error('some error');
            readDirsStub.rejects(error);
            readFileStub.resolves(undefined);
            return expect(sut.linkBinsToChildren()).to.rejectedWith(error);
        });

        describe('with 2 children and multiple dependencies with and without bins', () => {
            const parentPkg: PackageJson = {
                devDependencies: { 'devDep-1': 'x', 'devDep-2': 'x' },
                dependencies: { 'dep-1': 'x', 'dep-2': 'x' }
            };
            const devDepPkg: PackageJson = {
                bin: { 'devDep': 'devDep.sh', 'devDepAwesome': 'devDepAwesome.sh' }
            };
            const depPkg: PackageJson = {
                bin: { 'dep': 'dep.sh' }
            };

            beforeEach(() => {
                readFileStub.resolves('{}')
                    .withArgs('package.json').resolves(JSON.stringify(parentPkg))
                    .withArgs(path.join('node_modules', 'devDep-1', 'package.json')).resolves(JSON.stringify(devDepPkg))
                    .withArgs(path.join('node_modules', 'dep-1', 'package.json')).resolves(JSON.stringify(depPkg));
                readDirsStub.withArgs('packages').resolves(['child-1', 'child-2']);
                readDirsStub.withArgs('alternativeChildHostingDir').resolves(['child-3']);
            });

            it('should link only devDependencies', async () => {
                linkStub.resolves(undefined);
                const devDepSH = path.resolve('node_modules', 'devDep-1', 'devDep.sh');
                const devDepAwesomeSH = path.resolve('node_modules', 'devDep-1', 'devDepAwesome.sh');
                await sut.linkBinsToChildren();
                expect(linkStub).callCount(4);
                expect(linkStub).calledWith(devDepSH, path.join('packages', 'child-1', 'node_modules', '.bin', 'devDep'));
                expect(linkStub).calledWith(devDepSH, path.join('packages', 'child-2', 'node_modules', '.bin', 'devDep'));
                expect(linkStub).calledWith(devDepAwesomeSH, path.join('packages', 'child-1', 'node_modules', '.bin', 'devDepAwesome'));
                expect(linkStub).calledWith(devDepAwesomeSH, path.join('packages', 'child-2', 'node_modules', '.bin', 'devDepAwesome'));
            });

            it('should link dependencies if that is configured', async () => {
                // Arrange
                linkStub.resolves(undefined);
                options.linkDependencies = true;
                options.linkDevDependencies = false;
                const depSH = path.resolve('node_modules', 'dep-1', 'dep.sh');

                // Act
                await sut.linkBinsToChildren();

                // Assert
                expect(linkStub).callCount(2);
                expect(linkStub).calledWith(depSH, path.join('packages', 'child-1', 'node_modules', '.bin', 'dep'));
                expect(linkStub).calledWith(depSH, path.join('packages', 'child-2', 'node_modules', '.bin', 'dep'));
            });

            it('should log an error if linking is rejected', async () => {
                const logErrorStub = sandbox.stub((sut as any).log, 'error');
                const err = new Error('some error');
                linkStub.rejects(err);
                await sut.linkBinsToChildren();
                expect(logErrorStub).calledWith('Could not link bin devDep for child child-1.', err);
                expect(logErrorStub).callCount(4);
            });

            it('should use a different child dir if configures', async () => {
                options.childDirectoryRoot = 'alternativeChildHostingDir';
                const depSH = path.resolve('node_modules', 'devDep-1', 'devDep.sh');
                await sut.linkBinsToChildren();
                expect(linkStub).calledWith(depSH, path.join('alternativeChildHostingDir', 'child-3', 'node_modules', '.bin', 'devDep'));
            });
        });
    });
});