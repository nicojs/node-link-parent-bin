[![Build Status](https://travis-ci.org/nicojs/node-link-parent-bin.svg?branch=master)](https://travis-ci.org/nicojs/node-link-parent-bin)

# Link parent bin

Link the bins of parent (dev) dependencies to the child packages in a multi-package [lerna](https://lernajs.io/)-like project. Stuff just works as expected.

## About

Let's say your repo looks like this:

```
root/
  package.json
  packages/
    package-1/
      package.json
    package-2/
      package.json
```

Well... you're probably managing your `devDependencies` at root level only. For example: you have one `mocha` installed at root with `npm i -D mocha`.

Now if you add an npm script in `package-1/package.json`:

```json
"scripts": {
    "test": "mocha"
}
``` 

And run:

```bash
$ npm run test

> package-1@0.0.1 test /package-1
> mocha

'mocha' is not recognized as an internal or external command

npm ERR!
```

...thats not so nice. You're basically forced to run all npm scripts from the root level. *But* after running `link-parent-bin`:

```bash
$ npm run test

> package-1@0.0.1 test /package-1
> mocha

  linked from parent...
      √ and it worked!
```

## Getting started

Install the package in the **root** of your multiple packages repository.

```bash
npm i -D link-parent-bin
```

Add the following npm script in your root `package.json`:

```json
"scripts": {
    "link-parent-bin": "link-parent-bin"
}
```

Run it with `npm run link-parent-bin`. 

```bash
npm run link-parent-bin

[INFO] ParentBinLinker - Linking dependencies ["mocha"] under children ["package-1", "package-2"]
```

And your done.

## Improve your workflow

Since you're probably not releasing your parent module anyway, it might be better to add the linking to the post-install step:

```json
"scripts": {
    "postinstall": "link-parent-bin"
}
```

*-or if you're using lerna*

```json
"scripts": {
    "postinstall": "lerna bootstrap && link-parent-bin"
}
```

This way, other developers don't have to run this script manually. 

## Command line options

```bash
$ node_modules/.bin/link-parent-bin --help

  Usage: link-parent-bin [options]

  Options:

    -h, --help                                    output usage information
    -V, --version                                 output the version number
    -c, --child-directory-root <child-directory>  The directory that hosts the child packages relative to the parent root.
    -d, --link-dev-dependencies <true|false>      Enables linking of parents `devDependencies`. Defaults to: true
    -s, --link-dependencies <true|false>          Enables linking of parents `dependencies`. Defaults to: false
    -l, --log-level <debug|info|error>            Set the log level
```

## Use programmatically

```js
const linkParentBin = require('link-parent-bin');
const linker = new ParentBinLinker({ childDirectoryRoot: 'packages', linkDevDependencies: true, linkDependencies: false });
linker.linkBinsToChildren()
    .then(() => console.log('done'))
    .catch(err => console.error('Error Linking packages', err));
```

Type declaration files are included for the TypeScript developers out there.