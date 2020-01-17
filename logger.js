module.exports.log = function(req, res) {
  console.log(`test: [${Date()}] ${req.originalUrl}`);
};

module.exports.log = function(message) {
  console.log(`[${Date()}] ${message}`);
};
