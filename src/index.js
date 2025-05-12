const watch = require('watch');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const child_process = require('child_process');

const spawn = child_process.spawn;

watch.watchTree(
  '/Users/nirmal/ghq/github.com/nirmal-mekala/word-counter',
  function (f, curr, prev) {
    if (typeof f == 'object' && prev === null && curr === null) {
      console.log('finished walking the tree');
      // Finished walking the tree
    } else if (prev === null) {
      console.log('File ' + f + ' was created');
      // f is a new file
    } else if (curr.nlink === 0) {
      console.log('File ' + f + ' was removed');
      // f was removed
    } else {
      console.log('File ' + f + ' was changed');
      // f was changed
    }
  },
);

const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
console.log(dom.window.document.querySelector('p').textContent); // "Hello world"

pandoc = spawn('pandoc', ['--version']);
pandoc.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});
pandoc.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});
pandoc.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
