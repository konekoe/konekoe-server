const { verifyToken } = require('konekoe-server-utils');
const { JsonWebTokenError, MessageError } = require('../../utils/errors');
const { JWT_PUBLIC, TOKEN_VERIFY_OPTIONS } = require("../../utils/Config.js");
const services = require('../../services').daemon;


async function server_connect({ token, hwid }) {
  this.logger.serverInfo("entered server_connect");

  if (!(token && hwid))
    return Promise.reject(new MessageError("Invalid payload"));

  try {
    const userInfo = verifyToken(token, JWT_PUBLIC, TOKEN_VERIFY_OPTIONS);

    this.logger.debug(userInfo);

    if (!userInfo)
      throw new JsonWebTokenError();

    const studentDoc = await services.findStudent(userInfo.studentId);

    if (!studentDoc)
      return  Promise.reject(Error("No student found"));

    let authKeyDoc = await services.getAuthKey(studentDoc._id.toString(), this.exam._id.toString());

    console.log(authKeyDoc);

    return { student: { studentDoc, hwid }, payload: { config: { ...this.config, home_encryption_key: authKeyDoc._id.toString() } } };

  }
  catch (err) {
    return Promise.reject(err);
  }
};

module.exports = {
  server_connect
};
