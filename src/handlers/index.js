const daemon = require('./daemon');
const examView = require('./examView');

exports.connection = {
  ...daemon.connection,
  ...examView.connection
};

exports.student = daemon.student;
exports.teacher = examView.teacher;
