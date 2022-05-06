# couchpcp

A proof-of-concept tool that allows a single partition of a Cloudant/CouchDB partitioned database to be copied to a target database without replication. This **is not** replication:

- It doesn't transfer every revision of every document. Only the winners.
- It doesn't transfer attachments.
- It optionally doesn't transfer deleted documents.
- It optionally doesn't transfer design documents documents.

It can be faster than replication but gets its speed by assuming that the source database is static and the the target database is empty. 

## How does it work?

The source database's __all_docs_ is consumed in batches and a queue of bulk writes is built
up in the app. The queue is worked through at a specified concurrency with the data being written to the target database in batches.

## Installation

```sh
npm install -g couchpcp
```

## Configuration

Both producer and consumer are configured using command-line parameters:

- `--source`/`-s` - the URL of the source Cloudant database, including authentication.
- `--target`/`-t` - the URL of the target Cloudant database, including authentication.
- `--partition`/`-p` - the partition key of the partition to copy
- `--batchsize`/`-b` - the number of documents per write request. (Default 500)
- `--concurrency`/`-c` - the number of writes in flight. (Default 2)
- `--maxwrites`/`-m` - the maximum number of write requests to issue per second. (Default 5)
- `--filterdesigndocs`/`--fdd` - whether to omit design documents from the data transfer. (Default false)
- `--filterdeletions`/`--fd` - whether to omit deleted documents from the data transfer. (Default false)
- `--resetrev`/`-r` - omits the revision token, resetting the targets revisions to `1-xxx'. (Default false)

 or environment variables:

- `SOURCE_URL` - the URL of the source Cloudant database, including authentication.
- `TARGET_URL` - the URL of the target Cloudant database, including authentication.
- `PARTITION` - the partition key of the partition to copy.
- `BATCH_SIZE` - the number of documents per write request. (Default 500)
- `CONCURRENCY` - the number of writes in flight. (Default 2)
- `MAX_WRITES_PER_SECOND` - the maximum number of write requests to issue per second. (Default 5)
- `FILTER_DESIGN_DOCS` - whether to omit design documents from the data transfer. (Default false)
- `FILTER_DELETIONS` - whether to omit deleted documents from the data transfer. (Default false)
- `RESET_REV` - omits the revision token, resetting the targets revisions to `1-xxx'. (Default false)

## Usage

Command-line parameters:

```sh
> couchpcp -s 'https://u:p@host.cloudant.com/source' -t 'https://u:p@host.cloudant.com/target' -p 'abc123'
```

Environment variables:

```sh
> export SOURCE_URL="https://u:p@host.cloudant.com/source"
> export TARGET_URL="https://u:p@host.cloudant.com/target"
> export PARTITION="abc123"
> couchpcp
```

## Programmatic usage

Simply `require` in the `couchpcp` library and execute `couchpcp.migrate` with an object containing the capitalized parameters above:

```js
const couchpcp = require('couchpcp')

const main = async () => {
  // migrate partition 3
  const config = {
    SOURCE_URL: `${process.env.COUCH_URL}/alerts`,
    TARGET_URL: `${process.env.COUCH_URL}/alerts3`,
    PARTITION: '3',
    BATCH_SIZE: 500,
    CONCURRENCY: 2,
    MAX_WRITES_PER_SECOND: 50
  }
  await couchpcp.migrate(config)

  // migrate partition 2
  config.TARGET_URL = `${process.env.COUCH_URL}/alerts2`
  config.PARTITION = '2'
  await couchpcp.migrate(config)
}

main()
```

## Discussion

The _couchpcp_ utility can transfer data from source to target faster than replication, but it isn't doing the same job as only winning revisions are transferred and attachments are dropped. Proceed with caution if your source database is changing when running _couchpcp_ or if your target database is not empty.

If your use-case can cope with the source database being static and the target database being empty, then you can transfer data much faster than replication.

## Debugging

To see extra debug messages, run _couchpcp_ with the environment variable `DEBUG` set to `couchpcp` e.g.

```sh
```sh
> DEBUG=couchpcp couchpcp -s "$URL/source" -t "$URL/target" -p "abc123"
```