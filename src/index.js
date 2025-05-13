// const watch = require('watch');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const child_process = require('child_process');
const spawn = child_process.spawn;
const chalk = require('chalk');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const readline = require('readline');

const argv = args();
let initialWordCount;
main();

function main() {
  parseMarkdownAndRenderOutput();

  // TODO arg handling - should be able to set goal via command line
  // TODO break out
  // TODO error handlin
  // --> no file
  // --> no pandoc

  fs.watchFile(argv.path, (event, filename) => {
    parseMarkdownAndRenderOutput();
  });
}

function parseMarkdownAndRenderOutput() {
  pandoc = spawn('pandoc', ['-s', argv.path]);
  pandoc.stdout.on('data', (html) => {
    const wordCount = countHTMLWords(html);
    if (!initialWordCount) {
      initialWordCount = wordCount;
    }
    renderOutput(wordCount, initialWordCount, argv.goal);
  });
  pandoc.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
    process.exit(1);
  });
}

function args() {
  return yargs(hideBin(process.argv))
    .options({
      goal: {
        alias: 'g',
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
}

function renderOutput(wordCount, originalWordCount, goal) {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  const pastGoal = wordCount - originalWordCount >= goal;
  const color = pastGoal ? chalk.green : chalk.red;
  const message = pastGoal
    ? chalk.green.inverse('GOAL MET')
    : chalk.red.inverse('KEEP WRITING');
  console.log(`

  Word Count: ${color(wordCount)}
  Goal:       ${originalWordCount + goal}
  
  ${message}

  `);
}

function countHTMLWords(html) {
  const dom = new JSDOM(html);
  const textContent = Array.from(dom.window.document.querySelectorAll('p'))
    .map((node) => node.textContent)
    .join(' ');
  return countWords(textContent);
}

function countWords(str) {
  // Match all runs of word characters (letters, digits, underscores)
  const matches = str.match(/\b\w+\b/g);
  // If there are no matches, return 0; otherwise return the count
  return matches ? matches.length : 0;
}
