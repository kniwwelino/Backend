const config = require('config');



var urlBroker = config.get('broker');


module.exports.url = function() {
  return urlBroker.protocol + '://' + urlBroker.username + ':' + urlBroker.password + '@' + urlBroker.hostname;
}
