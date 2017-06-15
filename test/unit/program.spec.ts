import { Options, program } from '../../src/program';
import { expect } from 'chai';

const expectToInclude = <T>(actual:T, expected: T) => {
    for(const key in expected){
        expect(actual[key], `Matching key ${key}`).to.eq(expected[key]);
    }
}

describe('program', () => {

    describe('parse', () => {
        it('should parse [] to default values', () => {
            const defaultOptions: Options = {  
                logLevel: 'info',
                linkDependencies: false,
                linkDevDependencies: true,
                linkLocalDependencies: false,
                childDirectoryRoot: 'packages'
            }
            const actualOptions = program.parse([]);
            expect(actualOptions).to.contain.all.keys(defaultOptions);
            expectToInclude(actualOptions, defaultOptions);
        });
        it('should parse overridden option', () => {
            const expected: Options = {  
                logLevel: 'error',
                linkDependencies: true,
                linkDevDependencies: false,
                linkLocalDependencies: false,
                childDirectoryRoot: 'some-other-folder'
            }
            const actualOptions = program.parse(['', '', '--link-dev-dependencies', 'false', '--link-dependencies', 'true', '-l', 'error', '--child-directory-root', 'some-other-folder']);
            expect(actualOptions).to.contain.all.keys(expected);
            expectToInclude(actualOptions, expected);
        });
    });
});