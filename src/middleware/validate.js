const { ValidationError } = require("../errors");

const LOCATIONS = ["params", "query", "body"];

function validate(schemas) {
  return (req, res, next) => {
    const details = [];
    const validated = {};

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            location,
            field: issue.path.join(".") || location,
            message: issue.message,
          });
        }
      } else {
        validated[location] = result.data;
      }
    }

    if (details.length > 0) {
      return next(new ValidationError(details));
    }

    req.validated = validated;
    next();
  };
}

module.exports = validate;
