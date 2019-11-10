#!/usr/bin/env node
import { logger } from './messages';
import { MdnCssPropData, allProps } from './props';
import puppeteer from 'puppeteer';
import { writeFile } from 'fs';

class Start {
  args: string[];
  concurrentProcesses = 40;
  outFile = './cssData.json';
  constructor() {
    const [, , ...argumentArr] = process.argv;
    this.args = [];
    argumentArr.forEach((arg, i) => {
      this.args[i] = arg === undefined ? '' : arg.toLowerCase();
      if (this.args[i] === '--concurrent') {
        this.concurrentProcesses = +argumentArr[i + 1];
      }
      if (this.args[i] === '--outFile') {
        this.outFile = argumentArr[i + 1].replace(/^'(.*)'$/, '$1');
      }
    });
    this.run();
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
    const allKnownCssPropsData = (await allProps()).properties;
    logger.Log('info', 'Fetched All Props');
    const mdnData = await MdnCssPropData();
    logger.Log('info', 'Fetched Mdn Data');

    let fileBody: any = {};
    const shadowArr = Array(allKnownCssPropsData.length - 1).fill(true);
    const openTabs: string[] = [];
    let added = 0;
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
                      values.push({ name: names[0].trim(), desc: value.desc.replace(/\n|  +/g, '') });
                    }
                  }
                }
                return values.length > 0 ? values : null;
              }
            }
            return null;
          });
          const data = mdnData[prop];
          const stats = `${shadowArr.length}|${openTabs.length}|${waitingTabs.length}|${failedProps.length}`;
          if (data || descriptions[prop]) {
            if (data && descriptions[prop] && values) {
              fileBody[prop] = {
                status: data.status,
                desc: `${descriptions[prop].replace(/\n|  +/g, '')}`,
                values
              };
            } else if (data && descriptions[prop]) {
              fileBody[prop] = {
                status: data.status,
                desc: `${descriptions[prop].replace(/\n|  +/g, '')}`
              };
            }
            logger.Log('prop', prop, stats);
            added++;
          } else {
            logger.Log('propFail', prop, stats);
          }
          openTabs.pop();
          newPage.close();
          const waitingTab = waitingTabs.pop();
          if (waitingTab) {
            processProp(waitingTab).catch(err => Catch(err, prop));
          }

          if (shadowArr.length === 0) {
            writeFile(this.outFile, JSON.stringify(fileBody), err => {
              if (err) {
                logger.Log('error', JSON.stringify(err));
              }
              logger.Log(
                'info',
                'Finished ',
                failed ? 'Some Props Failed' : 'Successfully',
                ` It Took ${(Date.now() - startTime) / 1000}s `,
                `${added}/${allKnownCssPropsData.length}`
              );
              if (failed) {
                console.log(failedProps, openTabs);
              }
            });
          }
          shadowArr.pop();
        } else {
          waitingTabs.push(prop);
        }
      };
      processProp(Prop).catch(err => Catch(err, Prop));
    }
  }
}
new Start();
