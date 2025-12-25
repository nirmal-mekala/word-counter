const { JSDOM } = require('jsdom');
const chalk = require('chalk');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const readline = require('readline');

(async () => {
  const [{ default: remarkParse }, { default: remarkHtml }, { unified }] = await Promise.all(
    [import('remark-parse'), import('remark-html'), import('unified')],
  );
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
    message = 'WRITE!'
    color = chalk.blue
  }

  const TOTAL_STRING = 'total:'
  const SESSION_TOTAL_STRING = 'session:'
  const GOAL_STRING = 'goal:'
  const REMAINING_STRING = 'remaining:'

  let textContent = []
  textContent.push(undefined)
  textContent.push([{ text: TOTAL_STRING }, { text: formatNum(wordCount), color }])
  textContent.push([{ text: SESSION_TOTAL_STRING }, { text: formatNum(sessionWordCount) }])
  if (goalMode) {
    textContent.push([{ text: REMAINING_STRING }, { text: formatNum(remaining) }])
    textContent.push([{ text: GOAL_STRING }, { text: formatNum(goal) }])
  }
  textContent.push(undefined)
  textContent.push([{ text: message, color: color.inverse }])


  print(textContent)
}


// content in should be: Array<Array<{text: string, color?: (v: string): string } | undefined> | undefined>
const print = (content) => {


  const helpers = {
    maxTotalLength(textContent) {
      const longestWords = [0, 0]
      textContent.forEach((line) => {
        if (Array.isArray(line)) {
          line.forEach((entry, i) => {
            if (entry && entry.text.length > longestWords[i]) {
              longestWords[i] = entry.text.length
            }
          })
        }
      })
      return longestWords.reduce((acc, curr) => acc + curr, 0)
    },
    space() {
      return ' '
    },
    padding() {
      return helpers.space().repeat(2)
    },
    wordCounterString() {
      return '.✧:* word counter ✧:*.'
    },
    toFormattedEntryString(entry) {
      if (!entry) {
        return ''
      }
      const format = entry?.color ?? ((v) => v)
      return format(entry?.text)
    },
    dynamicSpacing(maxTotalLength, line) {
      return helpers.space().repeat(maxTotalLength - line[0]?.text.length - line[1]?.text.length)
    },
    splashMessage() {
      return chalk.blue([helpers.padding(), helpers.wordCounterString()].join(""))
    }
  }


  console.log()
  console.log(helpers.splashMessage())
  content.forEach((line) => {
    if (!Array.isArray(line)) {
      console.log()
    } else {
      const [columnOneString, columnTwoString] = line.map(helpers.toFormattedEntryString)
      const maxTotalLength = helpers.maxTotalLength(content)
      const dynamicSpacing = helpers.dynamicSpacing(maxTotalLength, line)
      const lineString = [helpers.padding(), columnOneString, dynamicSpacing, helpers.padding(), columnTwoString].join('')
      console.log(lineString)
    }
  })
}

const formatNum = new Intl.NumberFormat('en-us').format
