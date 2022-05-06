#!/usr/bin/env node

const couchpcp = require('../index.js')
const config = require('../lib/config.js')

couchpcp.migrate(config)
