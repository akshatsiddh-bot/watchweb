const crypto = require('crypto');

function hashContent(normalizedText) {
  return crypto.createHash('sha256').update(normalizedText, 'utf8').digest('hex');
}

module.exports = { hashContent };
