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
main();

function main() {
  let initialWordCount;
  let wordCount;
  parseMarkdownAndRenderOutput();

  // TODO break out
  // TODO error handlin
  // --> no file
  // --> no pandoc

  function parseMarkdownAndRenderOutput() {
    pandoc = spawn('pandoc', ['-s', argv.path]);

    // Render "parsing markdown output"
    if (initialWordCount && wordCount) {
      renderOutput(wordCount, initialWordCount, argv.goal, true);
    }

    let chunks = [];
    pandoc.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });
    pandoc.stdout.on('end', () => {
      const html = Buffer.concat(chunks).toString('utf8');
      wordCount = countHTMLWords(html);
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

  fs.watchFile(argv.path, (event, filename) => {
    parseMarkdownAndRenderOutput();
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

function renderOutput(
  wordCount,
  originalWordCount,
  goal,
  parsingMarkdown = false,
) {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  const pastGoal = wordCount - originalWordCount >= goal;
  const wordCountString = pastGoal
    ? chalk.green(wordCount)
    : chalk.red(wordCount);
  const message = pastGoal
    ? chalk.green.inverse('GOAL MET')
    : chalk.red.inverse('KEEP WRITING');
  const parsingMarkdownMessage = parsingMarkdown ? chalk.cyan('parsing…') : '';
  console.log(`

  ${parsingMarkdownMessage}
  Word Count: ${wordCountString}
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
