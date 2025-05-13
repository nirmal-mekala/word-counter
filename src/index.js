const { JSDOM } = require('jsdom');
const { spawn, exec } = require('child_process');
const chalk = require('chalk');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const readline = require('readline');

main();

function main() {
  validatePandocInstall();
  const argv = parseArgv();
  let state = { initialWordCount: null, wordCount: null };
  parseMarkdownAndRenderOutput(state, argv);
  fs.watchFile(argv.path, (event, filename) => {
    parseMarkdownAndRenderOutput(state, argv);
  });
}

function validatePandocInstall() {
  exec('pandoc --version', (error, stdout, stderr) => {
    if (error) {
      console.error(chalk.red('Pandoc is not installed or not in PATH.'));
      process.exit(1);
    }
  });
}

function parseArgv() {
  return yargs(hideBin(process.argv))
    .options({
      goal: {
        alias: 'g',
        describe: '# additional words needed',
        demandOption: true,
        type: 'number',
      },
      path: {
        alias: 'p',
        describe: 'provide a path to file',
        demandOption: true,
        type: 'string',
      },
    })
    .check((argv, options) => {
      if (!fs.existsSync(argv.path)) {
        throw new Error(`✖ File not found: ${argv.path}`);
      } else {
        return true;
      }
    })
    .help()
    .parse();
}

function parseMarkdownAndRenderOutput(state, argv) {
  // Spawn pandoc process with provided path
  pandoc = spawn('pandoc', ['-s', argv.path]);

  // Render "parsing" markdown output
  if (state.initialWordCount && state.wordCount) {
    output(state.wordCount, state.initialWordCount, argv.goal, true);
  }
  processPandocOutput(pandoc, state, argv);
}

function processPandocOutput(pandoc, state, argv) {
  // Process pandoc output and handle errors
  let chunks = [];
  pandoc.stdout.on('data', (chunk) => {
    chunks.push(chunk);
  });
  pandoc.stdout.on('end', () => {
    const html = Buffer.concat(chunks).toString('utf8');
    // Update state values based on pandoc output
    state.wordCount = countHTMLWords(html);
    if (!state.initialWordCount) {
      state.initialWordCount = state.wordCount;
    }
    output(state.wordCount, state.initialWordCount, argv.goal);
  });
  pandoc.stderr.on('data', (data) => {
    console.error(chalk.red(`pandoc error: ${data}`));
    process.exit(1);
  });
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

function output(wordCount, originalWordCount, goal, parsingMarkdown = false) {
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
