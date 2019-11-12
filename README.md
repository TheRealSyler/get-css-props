## get-css-props

Combines this Data:
https://github.com/mdn/data
https://github.com/known-css/known-css-properties
https://www.w3schools.com/cssref/
https://developer.mozilla.org/en-US/docs/Web/CSS/`PROP`

##### Usage

`gcp`

##### Flags

| Name               | Default | Description                                                                  |
| ------------------ | ------- | ---------------------------------------------------------------------------- |
| `--outPath`        | `./`    | Path Where the Files will be created. NOTE: The path has to exist            |
| `--concurrent`     | `40`    | number of concurrent Tabs.                                                   |
| `--fileType`       | `json`  | `json | ts | js`                                                             |
| `--prefix`         |         | Prefixes every File.                                                         |
| `--ignore`         |         | Files in this list don't get Created. Example: `'noDataProps,standardProps'` |
| `-h h --help help` |         | Displays Help Message                                                        |

##### Output

| File            | Description                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `allProps`      | Contains All Properties.                                                                                        |
| `standardProps` | Contains All Standard Properties.                                                                               |
| `noDataProps`   | Contains All Properties That DON'T have a description or any data from [mdn/data](https://github.com/mdn/data). |
| `dataProps`     | Contains All Properties That HAVE a description or any data from [mdn/data](https://github.com/mdn/data).       |

##### Format

```typescript
type output = {
  [key: string]: {
    status?: string;
    mdn_url?: string;
    values?: Array<{ name: string; desc: string }>;
    desc?: string;
  };
};
```
