const { timeZoneOfIp, verifyToken } = require('konekoe-server-utils');
const { JWT_PUBLIC, TOKEN_VERIFY_OPTIONS } = require("../../utils/Config.js");
const services = require('../../services').daemon;
//-------------------------------------------Helpers-------------------------------------


//------------------------------------Handlers---------------------------------------



async function request_time() {
  this.logger.serverInfo('Sending time_request.');

  try {
    this.logger.debug(`Socket ip: ${ this.ip }`);
    let time_string = new Date().toJSON();
    let time_zone = (await timeZoneOfIp('86.50.146.92')).timezone;

    this.logger.serverInfo(`Requested time and it was: ${ time_string }, ${ time_zone }`);
    return { time_string, time_zone };

  }
  catch (err) {
    throw err;
  }
};

async function save_file({ filename, flags, data, file_type }) {
  this.logger.serverInfo('Received a file.');

  let info = {
    filename: filename || `${ this.id }-${ (new Date).toJSON() }.png`,
    flags: flags || 755,
    data: Buffer.from(data, 'base64')
  };

  try {
    services.createExamFile(info, this.exam, this.doc, `${ file_type }s`);
  }
  catch (err) {
    this.logger.debug(err.stack);

    throw new Error('Could not save file!');
  }

  return null;
};

async function request_resource({ token }) {
  this.logger.serverInfo("Requested resource");

  try {
    const { _id } = verifyToken(token, JWT_PUBLIC, TOKEN_VERIFY_OPTIONS);

    const temp = await services.findFile(_id);

    let { filename, data, flags } = temp;
    flags = flags || 0;
    data = (data) ? data.toString("base64") : '';

    return { token, filename, data, flags };
  }
  catch (err) {
    throw err;
  }

};

async function config_update() {
  return { payload: { config: this.msgHandler.config } }
};

async function log_message({ message, level }) {
  this.logger[level](message);
  return null;
};

async function log_action({ url_open }) {
  try {
    await services.recordUrl(this.doc, this.exam._id, url_open);
  }
  catch (err) {
    this.logger.serverError(err.message);
  }

  return null;
};

module.exports = {
  request_time,
  save_file,
  request_resource,
  log_message,
  config_update,
  log_action
}
