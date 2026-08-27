const { validationResult } = require('express-validator');

/**
 * Run after an array of express-validator checks. Returns 400 with field-level
 * errors if validation failed, otherwise calls next().
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return next();
}

module.exports = validate;
