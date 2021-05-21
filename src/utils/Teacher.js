'use strict'
const { generalLogger } = require("konekoe-server-log");
const handlers = require("../handlers").teacher;
const EventEmitter = require('events');

class Teacher extends EventEmitter {
  constructor(msgHandler, initialStudents, initialLog) {
    super();

    this.handlers = {};

    for (let key in handlers) {
      this.handlers[key] = handlers[key].bind(this);
    }


    this.changeMsgHandler = this.changeMsgHandler.bind(this);
    this.updateStudents = this.updateStudents.bind(this);
    this.updateLogger = this.updateLogger.bind(this);
    this.close = this.close.bind(this);

    this.changeMsgHandler(msgHandler);

    msgHandler.sendMsg({
      type: "view_connect",
      payload: {
        students: initialStudents,
        log: initialLog
      }
    });
    
    this.updateLogger();

    this.logger.serverInfo(`${ this.id } connected`);
  }

  changeMsgHandler(newMsgHandler) {
    this.msgHandler = newMsgHandler;

    this.msgHandler.sock.on("close", () => this.emit('close'));
    this.msgHandler.addHandlers(this.handlers);
    this.msgHandler.switchHandler();
    this.msgHandler.emptyQueue();
  }

  updateLogger(logger) {
    if (this.logger)
      this.logger.removeAllListeners()
    
    this.logger = (logger) ? logger : generalLogger;

    this.logger.on("logged", (msg) => { 
      this.msgHandler.sendMsg({
        type: "update_log",
        payload: msg  
      })
    });
  }

  updateStudents(student) {
    this.logger.debug("Updating exam view students.");
    this.msgHandler.sendMsg({ type: "update_student", payload: student });
  }

  close() {
    return this.msgHandler.close();
  }

}

module.exports = Teacher;
