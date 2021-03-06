/*
  === lib/app.js calls this file ===
  Reimplimented the old "routes" folder as Feathers "services"
*/

// Load other app modules
const database = require('./database')
const photoManager = require('./photoManager')
const helpers = require('./helpers')

// Prepare this module
const path = require('path')
const url = require('url')

// ===== Assorted functions and custom middleware =====

// Standard context of data to pump into browser
const stdContext = {
  baseURL: global.baseURL,
  companyName: global.companyName,
  depTeams: global.depTeams,
  offices: global.offices,
  supportContact: global.supportContact
}

// Render stdContext as MessagePack
function exportNodeData (req, res) {
  global.logger.log('debug', 'dataMP')
  res.send(JSON.stringify(stdContext))
}

// Render admin page
function renderAdmin (req, res) {
  global.logger.log('debug', 'renderAdmin')
  res.render('admin', { stdContext })
}

// Render floorplan
function renderFloorplan (req, res) {
  // TODO: fix dynamic office lookup
  // WAS LODASH / UNDERSCORE
  const index = global.offices.findIndex(offId => req.params.office === offId)
  const office = global.offices[index] || global.offices[0] // default to 1st office
  global.logger.log('debug', `Rendering floorplan for ${office.officeID}`)
  res.render('floorplan', {stdContext, svg: helpers.getSVG(office.officeID)})
}

// Photo upload
function uploadPhoto (req, res, next) {
  const uploadedFile = req.files.photo
  const personId = req.params.id
  const tempPath = uploadedFile.path

  return photoManager.importPhoto(tempPath, `${personId}.jpg`)
    .then((imgInfo) => {
      const basename = path.basename(imgInfo.path)
      const imageUrl = url.format({
        protocol: req.protocol,
        host: req.get('host'),
        pathname: (`${global.baseURL.trim}/people:${personId}/photo`).replace('//', '/')
      })

      const payload = { files: [{
        name: basename,
        url: imageUrl,
        thumbnailUrl: imageUrl,
        size: imgInfo.size
      }]}

      /**
    * Browsers that upload using iframes require text/html or text/plain,
    * because application/json will create a download dialog.
    *
    * @see https://github.com/blueimp/jQuery-File-Upload/wiki/Setup#content-type-negotiation
    */
      res.format({
        json: () => {
          res.send(payload)
        },
        default: () => {
          res.send(JSON.stringify(payload))
        }
      })
    })
    .fail((err) => {
      res.type('text')
      res.send(400, err.stack || err.message || err)
    })
    .fail(next)
}

// ===== Routing logic =====

// -> /people + :id

const people = {
  async find (params) { await database.findPeople() },
  async get (id, params) { await database.findPeopleByOID(id) },
  async create (data, params) { await database.savePeople(data) },
  async update (id, data, params) { await database.savePeople(data) },
  async patch (id, data, params) {},
  async remove (id, params) { database.deletePeopleByOID(id) },
  setup (app, path) {}
}

module.exports = {exportNodeData, renderAdmin, renderFloorplan, uploadPhoto, people}
