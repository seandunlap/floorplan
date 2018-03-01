// Routing: lib/server.js <- routes/index.js <- this file

var cacheManager = require('cache-manager')
var express = require('express')
var path = require('path')
var request = require('request')

var photoStaticHandler = express.static(path.join(global.dirRoot, 'data'), { maxAge: 4 * 60 * 60 * 1000 })

var memoryCache = cacheManager.caching({
  store: 'memory',
  max: 100,
  ttl: 5 // seconds
})

var stormRequestOptions = {
  auth: {
    'username': global.stormUsername,
    'password': global.stormPassword,
    'sendImmediately': true
  },
  json: true,
  // proxy: 'http://10.4.5.181:9998',
  // strictSSL: false,
  timeout: 3000
}

global.app.get('/endpoints', function (req, res) {
  var url = global.config.stormApiRoot + 'endpoints'
  // console.log("request to storm ("+url+")...");
  if (isStormIntegrationEnabled) {
    request(url, stormRequestOptions, function (err, stormResponse, body) {
      // console.log("response from storm", stormResponse);
      if (err != null) {
        global.logging.log('warn', 'failed to get endpoints from Storm', err)
        res.json(500, err)
      } else {
        res.json(body)
      }
    })
  } else {
    res.json([])
  }
})

global.app.get('/endpoints/status', function (req, res) {
  if (isStormIntegrationEnabled()) {
    memoryCache.wrap('bjn-endpoints', function (cacheResult) {
      global.logging.log('info', 'Requesting endpoint status from Storm...')
      request(global.config.stormApiRoot + 'endpoints/status', stormRequestOptions, function (err, res, body) {
        cacheResult(err, body)
      })
    }, function (err, result) {
      if (err != null) {
        global.logging.log('warn', 'failed to get endpoint status from Storm', err)
        res.json(500, err)
      } else {
        res.json(result)
      }
    })
  } else {
    res.json([])
  }
})

global.app.get('/endpoints/:id/photo', function (req, res) {
  req.url = '/photos/' + req.params.id + '.jpg'
  photoStaticHandler(req, res)
})

function isStormIntegrationEnabled () {
  return global.stormUsername && global.stormUsername.length && global.stormPassword && global.stormPassword.length
}
