const fetch = require('node-fetch');
export const MdnCssPropData = async () =>
  await (await fetch(`https://raw.githubusercontent.com/mdn/data/master/css/properties.json`)).json();

export const allProps = async () =>
  await (await fetch(`https://raw.githubusercontent.com/known-css/known-css-properties/master/data/all.json`)).json();
