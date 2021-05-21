'use strict'
const { Logger } = require("konekoe-server-log");
const handlers = require("../handlers").student;
const EventEmitter = require('events');

class Student extends EventEmitter {
  constructor(doc, hwid, msgHandler, exam) {
    super();

    this.doc = doc;
    this.id = doc.studentId;
    this.hwid = hwid;
    this.exam = exam;
    this.logger = Logger("konekoe-student.log", `log/${ this.id }`);    

    this.scrsh;
    this.messageId = 0;
    this.images = [ ];
    this.handlers = {};

    for (let key in handlers) {
      this.handlers[key] = handlers[key].bind(this);
    }

    this.replace = this.replace.bind(this);
    this.currentImg = this.currentImg.bind(this);
    this.nextImage = this.nextImage.bind(this);
    this.newScreenshot = this.newScreenshot.bind(this);
    this.changeMsgHandler = this.changeMsgHandler.bind(this);
    this.toJSON = this.toJSON.bind(this);
    this.close = this.close.bind(this);

    this.changeMsgHandler(msgHandler);

    this.logger.serverInfo(`${ this.id } connected`);
  }

  newScreenshot(data) {
    this.loggger.serverInfo('Saving screenshot');

    return { filename: `${this.id}.${(new Date).toJSON()}.png`, flags: 755 }
  }

  changeMsgHandler(newMsgHandler) {
    this.logger.serverInfo("Change handler");

    this.msgHandler = newMsgHandler;

    this.msgHandler.sock.on('close', () => {
      this.logger.serverInfo(`${ this.id } disconnected`);
      this.emit("close");
    });

    this.msgHandler.addHandlers(this.handlers);
    this.msgHandler.switchHandler();
    this.msgHandler.emptyQueue();
  }

  toJSON() {
    return { active: !this.msgHandler.isClosed(), id: this.id };
  }

  replace(newMsgHandler, hwid) {
    this.logger.serverInfo(`${ this.id } reconnected.`);

    if (this.msgHandler.isClosed()) {
      if (this.hwid !== hwid)
        this.logger.daemon_critical(`A student with the id ${ this.id } connected from a different device.`);

      this.hwid = hwid;
      this.changeMsgHandler(newMsgHandler);
      this.emit("open");
    }
    else {
      throw Error(`Another student with id ${ this.id } tried to connect`);
    }
  }

  scrshtNow() {
    this.logger.debug("%s: entered scrshtNow.", this.id);
  }



  currentImg() {
    return { image: this.scrsh.toString('base64'), specs: { id: this.id, time: 'Newest' } };
  }

  nextImage(sock, index, cb) {
    this.logger.debug('next image with index %d.', index);

    if (this.images.length > 0) {

      if (this.images.length < index || index < 0) cb(sock, RangeError());
      else if (index === 0) {
        cb(sock, false, this.currentImg());
      }
      else {
        let i = index - 1;

        this.logger.debug('current image from %s.', this.images[i]);

        fs.readFile(this.path + '/screenshots/' + this.images[i] + '.png', 'base64', (err, data) => {

          let message = {specs: {id: this.id, time: this.images[i]}};

          if (err) {
            this.logger.serverError(err.message);
            this.logger.debug(err.stack);

            messsage.specs.time = 'Newest';

            message.image = this.scrsh;
          }
          else {
            message.image = data;
          }

          cb(sock, false, message);
        });
      }
    }
    else
      cb(sock, false, this.currentImg());
  }

  close() {
    return this.msgHandler.close();
  }

}

module.exports = Student;
