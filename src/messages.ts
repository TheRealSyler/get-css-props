import chalk from 'chalk';
import { Logger, LoggerType } from 's.logger';

export const successFile = (filePath: string) => {
  console.log(chalk.green.bold(`Done! File created at ${filePath}`));
};
export const success = (message: any) => {
  console.log(chalk.green.bold(message));
};
export const failure = (message: string) => {
  console.log(chalk.red.bold(message));
};
export const info = (message: string) => {
  console.log(chalk.yellow.bold(message));
};

export const logger = new Logger<{ prop: LoggerType; info: LoggerType; error: LoggerType; propFail: LoggerType }>({
  prop: {
    styles: ['#2e0'],
    wrappers: [['(', ') ']]
  },
  propFail: {
    styles: ['#e60'],
    wrappers: [['(', ') ']]
  },
  info: {
    styles: ['#0af']
  },
  error: {
    styles: ['#f00'],
    wrappers: [['ERROR: (', ') ']]
  }
});
