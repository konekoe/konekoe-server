const { generalLogger } = require('konekoe-server-log');
const { createToken } = require('konekoe-server-utils');
const { MessageError } = require('./errors');
const { JWT_PRIVATE, TOKEN_SIGN_OPTIONS } = require("../utils/Config.js");
const handlers = require('../handlers').connection;
const EventEmitter = require('events');
const ErrorHandler = require('./ErrorHandler.js');

class MessageHandler extends EventEmitter {
  constructor(sock, ip, exam, getStudents) {
    super();

    this.sock = sock;
    this.ip = ip;
    this.logger = generalLogger;
    this.msgQueue = [];
    this.connected = false;
    this.getStudents = getStudents;
    this.exam = exam;
    this.config = {} //Updated through setConfig

    this.setConfig(exam.config)

    this.currentHandler = this.handleConnection.bind(this);
    this.parseMsg = this.parseMsg.bind(this);
    this.resolveMsg = this.resolveMsg.bind(this);
    this.switchHandler = this.switchHandler.bind(this);
    this.emptyQueue = this.emptyQueue.bind(this);
    this.isClosed = this.isClosed.bind(this);
    this.setConfig = this.setConfig.bind(this);
    this.close = this.close.bind(this);

    this.handlers = {};

    for (let key in handlers) {
      this.handlers[key] = handlers[key].bind(this);
    }

    sock.on('message', this.parseMsg );
    sock.on('close', this.close);
  }

  handleError(err) {
    this.logger.serverError(`${ err.name }, ${ err.stack }`);
    return ErrorHandler(err);
  }

  parseMsg(msg) {
    try {
      this.currentHandler(JSON.parse(msg));
    }
    catch (err) {
      this.logger.debug(err.stack);

      return this.sendMsg({ error: this.handleError(new MessageError("Could not parse message")) });
    }
  }

  async handleConnection(parsedMsg) {
    if (this.handlers[parsedMsg.type]) {
      let result = await this.resolveMsg(parsedMsg);

      if (result.error)
        return this.sendMsg(result);

      let temp = result.payload;
      result.payload = temp.payload;
      delete temp.payload;

      if (result.payload)
        this.sendMsg(result);

      const key = Object.keys(temp)[0];

      this.emit(key, temp[key]);
    }
    else {
      this.msgQueue.push(parsedMsg);
    }
  }

  async resolveMsg(parsedMsg) {
    const self = this;
    let result = { type: parsedMsg.type };


    try {
      if (self.handlers[parsedMsg.type]) {
        //Can be null
        result.payload = await this.handlers[parsedMsg.type](parsedMsg.payload);
      }
      else {
        throw new MessageError(`Invalid message type ${ parsedMsg.type }`);
      }
    }
    catch (err) {
      result.error = this.handleError(err);
    }

    return result;
  }

  async handleMsg(parsedMsg) {
    let result = await this.resolveMsg(parsedMsg);

    if (result.payload || result.error)
      this.sendMsg(result);
  }

  sendMsg(obj) {
    this.logger.debug(`Sending ${ obj.type }`);
    this.sock.send(JSON.stringify(obj));
  }

  addHandlers(someHandlers) {
    this.logger.serverInfo("Adding handlers");

    //Remove old handlers.
    this.handlers = {};

    for (let key in someHandlers) {
      this.logger.debug(key);
   
      this.handlers[key] = someHandlers[key];
    }

    this.logger.serverInfo("Finished adding handlers");
  }

  switchHandler() {
    this.currentHandler = (this.connected) ? this.handleConnection.bind(this) : this.handleMsg.bind(this);
    this.connected = !this.connected;
  }

  isClosed() {
    return this.sock.readyState === 3;
  }

  emptyQueue() {
    let timer = setInterval(() => {
      if (this.msgQueue.length) {
        return this.handleMsg(this.msgQueue.shift());
      }

      this.logger.debug("Queue empty");

      clearInterval(timer);
    }, 1000);
  }

  mapConfigField(str) {
    this.logger.debug(str);

    const fields = {
      restrictedDomains: "ip_name_list",
      restrictionTypeDomain: "ip_restriction_type",
      restrictedUrls: "url_name_list",
      restrictionTypeUrl: "url_restriction_type",
      applicationOptions: "launcher_icons",
      files: "files",
      scrshInt: "screenshot_interval",
      examUrl: "exam_url",
      examStart: "exam_start",
      examEnd: "exam_end"
    }

    return fields[str];
  }

  async setConfig(config) {
    for (let key in config) {
      this.config[this.mapConfigField(key)] = (key === "files") ? 
        config[key].map(file => createToken({ _id: file }, JWT_PRIVATE, TOKEN_SIGN_OPTIONS)) 
        : 
        config[key];
    }

    if (this.config_update)
      this.sendMsg({ type: "config_update", ...(await this.config_update()) });

  }

  async close(cb) {
    const self = this;

    return new Promise(async resolve => {
      await self.sock.close();
      return resolve(self.emit('close'));
    });
  }

};

module.exports = MessageHandler;
