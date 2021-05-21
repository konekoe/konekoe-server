const { verifyToken } = require('konekoe-server-utils');
const { JsonWebTokenError, MessageError } = require('../../utils/errors');
const { JWT_PUBLIC, TOKEN_VERIFY_OPTIONS } = require("../../utils/Config.js");
const helpers = require("./helpers.js");

async function view_connect() {
  this.logger.serverInfo("entered view_connect");

  //if (!token)
  //  throw new MessageError("Invalid payload");

  try {
    //const userInfo = verifyToken(token, JWT_PUBLIC, TOKEN_VERIFY_OPTIONS);

    const log = await helpers.readLog();

    return { teacher: { log } };

  }
  catch (err) {
    let throwMe = err;

    throw throwMe;
  }
};

module.exports = {
  view_connect
}
