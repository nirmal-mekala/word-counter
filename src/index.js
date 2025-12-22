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
        demandOption: false,
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

  let pastGoal
  let color
  let message
  let remaining
  const sessionWordCount = wordCount - originalWordCount > 0 ? wordCount - originalWordCount : 0

  const goalMode = goal !== undefined

  if (goalMode) {
    pastGoal = wordCount - originalWordCount >= goal;
    color = pastGoal ? chalk.green : chalk.red;
    message = pastGoal ? 'GOAL MET' : 'KEEP WRITING';
    remaining = pastGoal ? 0 : goal - (wordCount - originalWordCount);
  } else {
    color = chalk.blue
  }

  const WORD_COUNT_STRING = 'Total Word Count:'
  const SESSION_WORD_COUNT_STRING = 'Session Word Count:'
  const GOAL_STRING = 'Goal:'
  const REMAINING_STRING = 'Remaining:'
  const PREFIX = '  '

  /*
   * TODO: improve render function - should handle columns better,
   * have more spacing, right align numbers, and format numbers
   */
  const render = (columnOneString, columnTwoString) => {
    if (columnOneString === undefined && columnTwoString === undefined) {
      console.log()
      return
    }

    const secure = (unsafeString) => {
      return unsafeString === undefined ? '' : String(unsafeString)
    }

    const safeColumnOneString = secure(columnOneString)
    const safeColumnTwoString = secure(columnTwoString)

    const pad = (stringToRender) => {
      let longestStringLength = 0
      for (const str of [WORD_COUNT_STRING, REMAINING_STRING, GOAL_STRING, SESSION_WORD_COUNT_STRING]) {
        if (str.length > longestStringLength) {
          longestStringLength = str.length
        }
      }
      /*
       * TODO - refactor. this is a quick and dirty patch for when chalk strings throw off
       * the string calculation. chalk needs to be applied post string math
       */
      const ensurePositive = (num) => {
        return num >= 0 ? num : 0
      }

      return PREFIX + stringToRender + ' '.repeat(ensurePositive(longestStringLength - stringToRender.length + 1))
    }

    console.log(pad(safeColumnOneString) + safeColumnTwoString)
  }


  render()
  render(WORD_COUNT_STRING, color(wordCount))
  render(SESSION_WORD_COUNT_STRING, sessionWordCount)
  if (goalMode) {
    render(REMAINING_STRING, remaining)
    render(GOAL_STRING, goal)
    render()
    render(color.inverse(message))
  }
}
