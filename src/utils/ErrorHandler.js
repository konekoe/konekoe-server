const supportedErrs = Object.values(require('./errors')).map(err => err.name);

const ErrorHandler = (err) => {
  let result = { message: "An error occurred", time_stamp: (new Date()).toJSON() };

  if (supportedErrs.includes(err.name)) {
    result.message = err.message;
  }
  else {
    process.READY_TO_EXIT.error = true;
  }

  return result;
};

module.exports = ErrorHandler;
