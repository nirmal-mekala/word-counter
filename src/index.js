// const watch = require('watch');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const child_process = require('child_process');
const chalk = require('chalk');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const readline = require('readline');

const spawn = child_process.spawn;

const argv = yargs(hideBin(process.argv))
  .options({
    words: {
      alias: 'w',
      describe: '# additional words needed',
      demandOption: true,
    },
    path: {
      alias: 'p',
      describe: 'provide a path to file',
      demandOption: true,
    },
  })
  .help()
  .parse();

console.log('argv', argv);

// TODO arg handling - should be able to set goal via command line
// TODO break out
// TODO error handlin
// --> no file
// --> no pandoc

fs.watchFile(argv.path, (event, filename) => {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  console.log(chalk.magenta('watchfileHook running'))
  console.log(`argv.path ${argv.path} from watchFile hook`);
  pandoc = spawn('pandoc', ['-s', argv.path]);
  pandoc.stdout.on('data', (data) => {
    //  console.log(`stdout: ${data}`);
    const dom = new JSDOM(data);
    console.log(
      chalk.inverse.green(dom.window.document.querySelector('p').textContent),
    );
  });
  pandoc.stderr.on('data', (data) => {
    //    console.log(`stderr: ${data}`);
  });
  pandoc.on('close', (code) => {
    //    console.log(`child process exited with code ${code}`);
  });
});

// watch.watchTree(
//   '/Users/nirmal/ghq/github.com/nirmal-mekala/word-counter',
//   function (f, curr, prev) {
//     if (typeof f == 'object' && prev === null && curr === null) {
//       console.log('finished walking the tree');
//       // Finished walking the tree
//     } else if (prev === null) {
//       console.log('File ' + f + ' was created');
//       // f is a new file
//     } else if (curr.nlink === 0) {
//       console.log('File ' + f + ' was removed');
//       // f was removed } else {
//       console.log('File ' + f + ' was changed');
//       // f was changed
//     }
//   },
// );

// const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
// console.log(dom.window.document.querySelector('p').textContent); // "Hello world"
//
//
//

// console.log(Array.from(document.querySelectorAll('li')).map(node => node.textContent).join("-----"))
