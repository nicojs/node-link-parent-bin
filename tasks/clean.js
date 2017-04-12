const rimraf = require('rimraf');

const targetFiles = '+(*.d.ts|*.js|*.map)';

const rm = (path) => new Promise((resolve, reject) => rimraf(path, err => {
    if (err) {
        reject(err);
    } else {
        resolve();
    }
}));

Promise.all([
    rm(`src/**/${targetFiles}`),
    rm(`src/${targetFiles}`),
    rm(`test/**/${targetFiles}`),
    rm(`test/${targetFiles}`)]
).then(() => console.log('All paths cleaned'));