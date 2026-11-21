// Writes the built-in example datasets to examples/*.xlsx: node tools/make_examples.js
const path = require('path'), fs = require('fs');
const XLSX = require('../src/lib/xlsx.full.min.js');
const Examples = require('../src/examples.js');
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });
for (const ex of Examples.LIST) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ex.rows()), 'Data');
  fs.writeFileSync(path.join(dir, ex.id + '.xlsx'), XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  console.log(ex.id + '.xlsx', ex.rows().length, 'rows');
}
