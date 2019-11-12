import { Logger, LoggerType, PresetNodeHelp } from '@sorg/log';

export const logger = new Logger<{
  prop: LoggerType;
  info: LoggerType;
  error: LoggerType;
  propFail: LoggerType;
  created: LoggerType;
  help: LoggerType;
}>({
  prop: {
    styles: ['#2e0', '#0af'],
    preset: new PresetNodeHelp(undefined, undefined, 50)
  },
  propFail: {
    styles: ['#e60', '#0af'],
    preset: new PresetNodeHelp(undefined, undefined, 50)
  },
  info: {
    styles: ['#0af']
  },
  error: {
    styles: ['#f00'],
    wrappers: [['ERROR: (', ') ']]
  },
  created: {
    styles: ['#ff3'],
    customHandler: (data, converter, styler) => {
      let output = styler('CREATED FILE: ', '#f4f', null);
      for (let i = 0; i < data.rawMessages.length; i++) {
        const msg = data.rawMessages[i];
        output += styler(converter(msg, { typeStyles: data.typeStyles }), data.styles[i], null);
      }
      return output;
    }
  },
  help: {
    styles: [
      { color: '#f27', background: '#111' },
      { color: '#4e0', background: '#222' },
      { color: '#fa0', background: '#222' }
    ],
    preset: new PresetNodeHelp(
      `Help;
;
--outPath;Path Where the Files will be created.;NOTE: The path has to exist.
--concurrent;number of concurrent Tabs.
--fileType;File Type Only Supported Types Are:;json | ts | js
--prefix;Prefixes every File.
--ignore;Files in this list don't get Created.;Example: 'noDataProps,standardProps'
-h h --help help;Shows this Message.`
    )
  }
});
