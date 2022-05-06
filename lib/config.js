
const config = {
  SOURCE_URL: process.env.SOURCE_URL,
  TARGET_URL: process.env.TARGET_URL,
  PARTITION: process.env.PARTITION,
  FILTER_DESIGN_DOCS: process.env.FILTER_DESIGN_DOCS === 'true',
  FILTER_DELETIONS: process.env.FILTER_DELETIONS === 'true',
  RESET_REV: process.env.RESET_REV === 'true',
  BATCH_SIZE: process.env.BATCH_SIZE || '500',
  CONCURRENCY: process.env.CONCURRENCY || '2',
  MAX_WRITES_PER_SECOND: process.env.MAX_WRITES_PER_SECOND || '50'
}

const args = require('yargs')
  .option('source', { alias: 's', type: 'string', describe: 'Source CouchDB database URL', default: config.SOURCE_URL, demandOption: true })
  .option('target', { alias: 't', type: 'string', describe: 'Target CouchDB database URL', default: config.TARGET_URL, demandOption: true })
  .option('partition', { alias: 'p', type: 'string', describe: 'The source partition to copy', default: config.PARTITION, demandOption: true })
  .option('filterdeletions', { alias: 'fd', type: 'boolean', describe: 'Filter out deleted documents', default: config.FILTER_DELETIONS })
  .option('filterdesigndocs', { alias: 'fdd', type: 'boolean', describe: 'Filter out design documents', default: config.FILTER_DESIGN_DOCS })
  .option('resetrev', { alias: 'r', type: 'boolean', describe: 'Reset the revision token', default: config.RESET_REV })
  .option('batchsize', { alias: 'b', type: 'number', describe: 'Number of documents written in one bulk write', default: config.BATCH_SIZE })
  .option('concurrency', { alias: 'c', type: 'number', describe: 'Number of write HTTP calls in flight at one time', default: config.CONCURRENCY })
  .option('maxwrites', { alias: 'm', type: 'number', describe: 'Maximum number of writes per second', default: config.MAX_WRITES_PER_SECOND })
  .help('help')
  .argv

// copy back to config
const mapping = {
  source: 'SOURCE_URL',
  target: 'TARGET_URL',
  partition: 'PARTITION',
  filterdeletions: 'FILTER_DELETIONS',
  filterdesigndocs: 'FILTER_DESIGN_DOCS',
  resetrev: 'RESET_REV',
  batchsize: 'BATCH_SIZE',
  concurrency: 'CONCURRENCY',
  maxwrites: 'MAX_WRITES_PER_SECOND'
}
for (const i in mapping) {
  if (args[i]) {
    config[mapping[i]] = args[i]
  }
}

module.exports = config
