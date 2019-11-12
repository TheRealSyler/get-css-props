#!/usr/bin/env node
import { logger } from './messages';
import { MdnCssPropData, getAllProps } from './props';
import puppeteer from 'puppeteer';
import { writeFile } from 'fs';

type output = {
  [key: string]: {
    status?: string;
    mdn_url?: string;
    values?: Array<{ name: string; desc: string }>;
    desc?: string;
  };
};

class Start {
  args: string[];
  concurrentProcesses = 40;
  outPath = './';
  fileType = 'json';
  prefix = '';
  ignore: string[] = [];
  constructor() {
    const [, , ...argumentArr] = process.argv;
    this.args = [];
    argumentArr.forEach((arg, i) => {
      this.args[i] = arg === undefined ? '' : arg.toLowerCase();
      switch (arg) {
        case '--concurrent':
          this.concurrentProcesses = +argumentArr[i + 1];
          break;
        case '--outPath':
          this.outPath = argumentArr[i + 1].replace(/^'(.*)'$/, '$1');
          this.outPath = this.outPath.endsWith('/') ? this.outPath : this.outPath + '/';
          break;
        case '--fileType':
          this.fileType = argumentArr[i + 1].replace(/^\./, '');
          break;
        case '--prefix':
          this.prefix = argumentArr[i + 1];
          break;
        case '--ignore':
          this.ignore = argumentArr[i + 1].replace(/^'(.*)'$/, '$1').split(',');
          break;
      }
    });

    if (/^-h$|^h$|^--help$|^help$/.test(this.args[0])) {
      logger.Log('help');
    } else {
      this.run();
    }
  }
  private async run() {
    const startTime = Date.now();

    logger.Log('info', 'Starting');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.w3schools.com/cssref/');

    const descriptions = await page.evaluate(() => {
      let element = document.getElementById('cssproperties');
      if (element) {
        const descriptions: { [key: string]: string } = {};
        const elements = element.getElementsByTagName('tr');
        for (let i = 0; i < elements.length; i++) {
          const tr = elements[i];
          if (tr.childNodes[1] && tr.childNodes[3]) {
            if (tr.childNodes[1].textContent && tr.childNodes[3].textContent) {
              descriptions[tr.childNodes[1].textContent] = tr.childNodes[3].textContent;
            }
          }
        }
        return descriptions;
      }
      return null;
    });
    logger.Log('info', 'Fetched Descriptions');
    if (!descriptions) {
      logger.Log('error', 'Failed To Get Descriptions');
      return;
    }
    page.close();
    const allKnownCssPropsData = (await getAllProps()).properties;
    logger.Log('info', 'Fetched All Props');
    const mdnData = await MdnCssPropData();
    logger.Log('info', 'Fetched Mdn Data');

    const allProps: output = {};
    const standardProps: output = {};
    let standardPropsCounter = 0;
    const noDataProps: output = {};
    let noDataPropsCounter = 0;
    const dataProps: output = {};
    let dataPropsCounter = 0;
    const shadowArr = Array(allKnownCssPropsData.length - 1).fill(true);
    const openTabs: string[] = [];
    const waitingTabs: string[] = [];
    let failed = false;
    const failedProps: string[] = [];
    for (let j = 0; j < allKnownCssPropsData.length; j++) {
      const Prop = allKnownCssPropsData[j];
      const Catch = (err: any, prop: string) => {
        failedProps.push(prop);
        failed = true;
        logger.Log('error', prop, JSON.stringify(err));
        processProp(prop);
      };
      const processProp = async (prop: string) => {
        if (openTabs.length < this.concurrentProcesses) {
          openTabs.push(prop);
          const newPage = await browser.newPage();
          await newPage.goto(`https://developer.mozilla.org/en-US/docs/Web/CSS/${prop}`);
          const values = await newPage.evaluate(() => {
            let dl = document.querySelector('#Values + dl');
            if (dl) {
              if (dl.parentElement) {
                let values = [];
                const value = { name: '', desc: '' };
                for (let i = 0; i < dl.children.length; i++) {
                  const child = dl.children[i];
                  if (child.tagName === 'DT' && child.textContent) {
                    value.name = child.textContent;
                  } else if (child.tagName === 'DD' && child.textContent) {
                    value.desc = child.textContent;
                    if (!/^(<|\[)/.test(value.name)) {
                      const names = value.name.split('\n');
                      values.push({
                        name: names[0].trim(),
                        desc: value.desc.replace(/\n|  +/g, '')
                      });
                    }
                  }
                }
                return values.length > 0 ? values : null;
              }
            }
            return null;
          });
          const data = mdnData[prop];
          const stats = `Remaining: ${shadowArr.length} OpenTabs: ${openTabs.length} WaitingTabs: ${waitingTabs.length} Failed: ${failedProps.length}`;
          if (data || descriptions[prop]) {
            allProps[prop] = {};
            dataProps[prop] = {};
            if (data) {
              allProps[prop].status = data.status;
              allProps[prop].mdn_url = data.mdn_url;
            }
            if (descriptions[prop]) {
              allProps[prop].desc = `${descriptions[prop].replace(/\n|  +/g, '')}`;
            }
            if (values !== null) {
              allProps[prop].values = values;
            }
            if (data && data.status === 'standard') {
              standardProps[prop] = allProps[prop];
              standardPropsCounter++;
            }
            dataProps[prop] = allProps[prop];
            dataPropsCounter++;
            logger.Log('prop', prop, stats);
          } else {
            allProps[prop] = {};
            noDataProps[prop] = {};
            noDataPropsCounter++;
            logger.Log('propFail', prop, stats);
          }
          openTabs.shift();
          newPage.close();
          const waitingTab = waitingTabs.shift();
          if (waitingTab) {
            processProp(waitingTab).catch(err => Catch(err, prop));
          }

          if (shadowArr.length === 0) {
            if (!this.ignore.includes('allProps')) {
              await Write(this.getPath('allProps'), `${this.getTypeText('allProps')}${JSON.stringify(allProps)}`);
              logger.Log('created', this.getPath('allProps'));
            }
            if (!this.ignore.includes('standardProps')) {
              await Write(
                this.getPath('standardProps'),
                `${this.getTypeText('standardProps')}${JSON.stringify(standardProps)}`
              );
              logger.Log('created', this.getPath('standardProps'));
            }
            if (!this.ignore.includes('noDataProps')) {
              await Write(
                this.getPath('noDataProps'),
                `${this.getTypeText('noDataProps')}${JSON.stringify(noDataProps)}`
              );
              logger.Log('created', this.getPath('noDataProps'));
            }
            if (!this.ignore.includes('dataProps')) {
              await Write(this.getPath('dataProps'), `${this.getTypeText('dataProps')}${JSON.stringify(dataProps)}`);
              logger.Log('created', this.getPath('dataProps'));
            }

            logger.Log(
              'info',
              'Finished ',
              failed ? 'Some Props Failed' : 'Successfully',
              ` It Took ${(Date.now() - startTime) / 1000}s `
            );
            logger.Log(
              'info',
              `AllProps: ${allKnownCssPropsData.length}, standardProps: ${standardPropsCounter}, noDataProps: ${noDataPropsCounter}, dataProps: ${dataPropsCounter}, Failed: ${failedProps.length}`
            );

            process.exit(0);
          }
          shadowArr.pop();
        } else {
          waitingTabs.push(prop);
        }
      };
      processProp(Prop).catch(err => Catch(err, Prop));
    }
  }
  private getPath(name: string) {
    return `${this.outPath}${this.prefix ? this.prefix + '.' : ''}${name}.${this.fileType}`;
  }
  private getTypeText(name: string) {
    return /ts|js/.test(this.fileType)
      ? `export const ${name}${
          this.fileType === 'ts'
            ? ': {[key: string]: {status?: string, mdn_url?: string, values?: Array<{name: string, desc: string}>,desc?: string}}'
            : ''
        } = `
      : '';
  }
}
new Start();

async function Write(path: string, body: any) {
  return new Promise(res => {
    writeFile(path, body, err => {
      if (err) {
        logger.Log('error', JSON.stringify(err));
      }
      res();
    });
  });
}
