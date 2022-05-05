const config = require('./lib/config.js')
const debug = require('debug')('couchpcp')

// cloudant connection for target writes
const axios = require('axios').default
const READ_BATCH_SIZE = 2000

// rate-limited, fixed-concurrency queue
const qrate = require('qrate')
let counter = 0

// buffer of unsaved documents
const buffer = []

// milliseconds
const ms = () => {
  return new Date().getTime()
}

// output status
const status = () => {
  // output status
  const now = Math.floor((ms() - start) / 1000)
  process.stdout.write(`  ${now}s ${counter}/${numDocs}      \r`)
}

const sleep = async (t) => {
  return new Promise((resolve) => {
    setTimeout(resolve, t)
  })
}

// worker function that writes a batch of documents to Cloudant
const worker = async (batch) => {
  debug(`writing ${batch.docs.length} docs`)
  let containsRevs = false
  for (const i in batch.docs) {
    if (batch.docs[i]._rev) {
      containsRevs = true
      break
    }
  }
  if (containsRevs) {
    batch.new_edits = false
  }
  try {
    const req = {
      method: 'post',
      baseURL: config.TARGET_URL,
      url: config.TARGET_DATABASE_NAME + '/_bulk_docs',
      data: batch
    }
    await axios(req)
    counter += batch.docs.length
    status()
  } catch (e) {
    console.error(e)
  }
}

// queue of batch jobs limited to "concurrency" requests
// in flight at any one time and a maximum number of
// writes per second limited to "wps"
const q = qrate(worker, config.CONCURRENCY, config.MAX_WRITES_PER_SECOND)
let numDocs = 0
let scanEnded = false
const start = ms()

const main = async () => {
  let req, res
  let skip = 0
  // get meta data about the partition
  req = {
    method: 'get',
    baseURL: config.SOURCE_URL,
    url: `${config.SOURCE_DATABASE_NAME}/_partition/${config.PARTITION}`
  }
  res = await axios(req)
  if (res.status !== 200) {
    throw new Error('Source db/partition does not exist')
  }
  numDocs = res.data.doc_count || 0
  if (numDocs === 0) {
    throw new Error('No docs to copy from source')
  }
  console.log(`${numDocs} documents to copy from partition ${config.PARTITION}`)

  do {
    req = {
      method: 'get',
      baseURL: config.SOURCE_URL,
      url: `${config.SOURCE_DATABASE_NAME}/_partition/${config.PARTITION}/_all_docs`,
      params: {
        skip,
        limit: READ_BATCH_SIZE,
        include_docs: true
      }
    }
    debug(`reading ${READ_BATCH_SIZE} docs, skip ${skip}`)
    try {
      res = await axios(req)
    } catch (e) {
      if (e.response.status === 429) {
        debug('429 Rate limited')
        await sleep(500)
        res = null
      } else {
        throw new Error('failed to fetch source documents')
      }
    }
    if (res && res.status < 300) {
      skip += READ_BATCH_SIZE
      const batch = res.data.rows
      for (const i in batch) {
        // find the doc
        const doc = batch[i].doc

        // optionally remove _rev
        if (config.RESET_REV) {
          delete doc._rev
        }

        // optionally ignore deletions
        if (config.FILTER_DELETIONS && batch[i].deleted === true) {
          continue
        }

        // optionally ignore design docs
        if (config.FILTER_DESIGN_DOCS && doc._id.startsWith('_design')) {
          continue
        }

        // add to the buffer and add to the batch queue
        if (doc) {
          buffer.push(doc)
          if (buffer.length > config.BATCH_SIZE) {
            const docsToWrite = buffer.splice(0, config.BATCH_SIZE)
            q.push({ docs: docsToWrite })
          }
        }
      }
      await sleep(50)
      if (batch.length < READ_BATCH_SIZE) {
        scanEnded = true
      }
    }
  } while (!scanEnded)
  flush()
}

// queue is empty
q.drain = () => {
  const end = ms()
  if (scanEnded) {
    console.log(`Written ${counter} documents to the target database in ${(end - start) / 1000}s`)
    process.exit()
  }
}

// catch the dregs of the buffer
const flush = () => {
  while (buffer.length > 0) {
    const n = Math.min(buffer.length, config.BATCH_SIZE)
    const docsToWrite = buffer.splice(0, n)
    q.push({ docs: docsToWrite })
  }
}

main()
