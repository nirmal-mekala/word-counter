const { JSDOM } = require('jsdom');
const { spawn, exec } = require('child_process');
const chalk = require('chalk');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const readline = require('readline');

(async () => {
  const [{ default: remarkParse }, { default: remarkHtml }] = await Promise.all(
    [import('remark-parse'), import('remark-html')],
  );
  const { unified } = await import('unified');
  global.remarkParse = remarkParse;
  global.remarkHtml = remarkHtml;
  global.unified = unified;
  main();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

function main() {
  const argv = parseArgv();
  let state = { initialWordCount: null, wordCount: null };
  parseMarkdownAndRenderOutput(state, argv);
  fs.watchFile(argv.path, (event, filename) => {
    parseMarkdownAndRenderOutput(state, argv);
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
  const markdown = fs.readFileSync(argv.path, 'utf8');
  const html = toHtml(markdown);
  countHtmlAndUpdateState(html, state);
  output(state.wordCount, state.initialWordCount, argv.goal);
}

function countHtmlAndUpdateState(html, state) {
  state.wordCount = countHTMLWords(html);
  if (!state.initialWordCount) {
    state.initialWordCount = state.wordCount;
  }
}

function toHtml(markdown) {
  const parsedMarkdown = unified()
    .use(remarkParse)
    .use(remarkHtml)
    .processSync(markdown);
  const html = String(parsedMarkdown);
  return html;
}

function countHTMLWords(html) {
  const dom = new JSDOM(html);
  const elements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol'];

  const textContent = elements
    .map((el) =>
      Array.from(dom.window.document.querySelectorAll(el)).filter((node) => {
        if (['OL', 'UL'].includes(node.tagName)) {
          let parent = node.parentElement;
          while (parent) {
            if (['OL', 'UL', 'LI'].includes(parent.tagName)) {
              return false;
            }
            parent = parent.parentElement;
          }
          return true;
        }
        return true;
      }),
    )
    .flat()
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

function output(wordCount, originalWordCount, goal) {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  const pastGoal = wordCount - originalWordCount >= goal;
  const color = pastGoal ? chalk.green : chalk.red;
  const message = pastGoal ? 'GOAL MET' : 'KEEP WRITING';
  const remaining = pastGoal ? 0 : goal - (wordCount - originalWordCount);

  console.log(`

  Word Count: ${color(wordCount)}
  Remaining:  ${remaining}
  Goal:       ${originalWordCount + goal}
  
  ${color.inverse(message)}

  `);
}
