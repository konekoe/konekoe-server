'use strict'
const net = require('net');
const http = require('http');

const { generalLogger } = require('konekoe-server-log');
const utils = require('../utils/functions');
const WebSocketHandler = require('../utils/WebSocketHandler');
const Student = require('./Student');
const Config = require('./Config');
const models = require('../../db/examModels');
const ServerConfig = require('../utils/ServerConfig');
const MongoConnect = require('../utils/MongoConnection');

//This class describes an Exam instance.
class Exam extends WebSocketHandler(){
  constructor(wsPort, httpPort, examCode) {
    super();
    super.wsInit(wsPort);
    this.examCode = examCode;
    this.httpPort = httpPort;


    this.server = http.createServer();

    this.server.on('error', function (err) {
      generalLogger.serverError(err.stack);
    });

    generalLogger.on('logging', (transport, level, msg, meta) => this.eVUpdLog(transport, level, msg, meta, 'none'));


    //bind functions that need access to members.
    this.init = this.init.bind(this);
    this.onConnection = this.onConnection.bind(this);
    this.close = this.close.bind(this);
    this.nextImg = this.nextImg.bind(this);
    this.fetchImage = this.fetchImage.bind(this);
    this.imgCallback = this.imgCallback.bind(this);
    this.scrshUpdate = this.scrshUpdate.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleStudent = this.handleStudent.bind(this);

    //eV = examView
    this.eVInit = this.eVInit.bind(this);
    this.eVUpdStudents = this.eVUpdStudents.bind(this);
    this.eVUpdLog = this.eVUpdLog.bind(this);
    this.eVChangeLog = this.eVChangeLog.bind(this);
    this.eVChangeList = this.eVChangeList.bind(this);
    this.eVChangeEnd = this.eVChangeEnd.bind(this);
    this.eVScreenShot = this.eVScreenShot.bind(this);
    this.eVSendCmd = this.eVSendCmd.bind(this);
    this.eVChangeTime = this.eVChangeTime.bind(this);

    //ws connections are put here. Student ID -> socket.
    this.students = [];
    this.conns = {};

    //Exam View connections are put here. Selected student -> list of sockets.
    this.ioSocks = new Set();

    //Tcp listening for connections
    this.wss.on('connection', this.onConnection);

    //Http routing
    this.io.on('connection', (socket) => this.eVInit(socket));
  }

  async init() {
      return new Promise(async (resolve, reject) => {
        try {
          //this.ip = await this.getMyIp();
          this.ip = '10.100.25.27';
          generalLogger.debug("My ip is:", this.ip);
          this.doc = await models.Exam.findOne({examCode: this.examCode}).exec();

          if (this.doc.active)
            return reject(new Error("Exam already active."));

          generalLogger.serverInfo("Exam with code %s started.", this.examCode);

          this.config = new Config(this.doc.config, generalLogger, this.handleError);
          await this.config.init();

          super.wsStart();
          this.server.listen(this.httpPort, () => generalLogger.serverInfo('Exam started listening to port', this.httpPort));

          if (!this.server.listening || !this.wsServer.listening)
            return reject(new Error("Could not start listening"));

          this.doc.active = true;
          this.doc.ip = this.ip;
          this.doc.wsPort = this.wsPort;
          this.doc.httpPort = this.httpPort;

          await this.doc.save();

          resolve();
        }
        catch (err) {
          this.close();
          reject(err);
        }
      });
  }

  async getMyIp() {
    var options = {
      host: 'ipv4bot.whatismyipaddress.com',
      port: 80,
      path: '/'
    };

    return new Promise((resolve, reject) => {
      http.get(options, function(res) {
        res.on("data", function(chunk) {
          resolve(chunk.toString());
        });
      }).on('error', function(err) {
        reject(err);
      });
    });
  }

  //TODO: More sophisticated error handling.
  handleError(err) {
    try {
      generalLogger.serverError(err.stack);
    }
    catch (e) {
      // This should only occur if generalLogger is null.
      generalLogger.serverError("Exam logger not initialized!", err.stack);
    }

    this.close();
  }

  onConnection(sock, req) {

    generalLogger.serverInfo("%s connected", req.connection.remoteAddress);

    sock.on('message', async (msg) => this.wsOnMessage(sock, msg, req.connection.remoteAddress));
    sock.on('close', () => this.wsOnClose(req));

  }

  //Expected message {token: String, hwid: String, id: Number}
  async wsOnMessage(sock, msg, ip) {
    try {
      var obj = JSON.parse(msg);
    }
    catch (err) {
      sock.send(JSON.stringify({error: {message: 'Could not parse message!', code: 0}}))
    }

    try {
      generalLogger.debug('Exam received message', obj);

      if (!obj.payload)
        throw new Error('No payload!');

      if (!obj.payload.token)
        throw new Error('Invalid payload.');

      let payload = obj.payload;

      var token = utils.verifyToken(payload.token, ServerConfig.files.tokenPublic, ServerConfig.verifyOptions);

      if (!token)
        throw new Error('Invalid token.');

      sock.removeAllListeners('message');

      await this.handleStudent(sock, token, payload.hwid, ip);

      sock.send(JSON.stringify({type: obj.type , payload: {config: this.config.getJSON()} }));
    }
    catch (err) {
      generalLogger.serverError(err.stack);
      sock.send(JSON.stringify({type: obj.type, error: {message: err.message, time_stamp: new Date().toString()}}));
    }
  }

  async handleStudent(sock, token, hwid, ip) {
    return new Promise(async (resolve, reject) => {
      try {
        let id = token.studentId;

        if (this.students.includes(id))
        return resolve(this.conns[token.studentId].replace(token));

        var doc = await models.Student.findOne({studentId: id}).exec();

        if (!doc)
          throw new Error("Not a valid student id.");

        let temp = new Student(sock, doc, hwid, this.doc._id, ip);
        await temp.init();

        this.conns[id] = temp;
        this.students.push(id);

        return resolve();
      }
      catch (err) {
        reject(err);
      }
    });
  }

  wsOnClose(req) {

    generalLogger.serverInfo("%s disconnected.", req.connection.remoteAddress);
  }

  scrshUpdate(id) {
    generalLogger.debug("%s: student with id %s received a new image", this.examCode, id);

    for (let sock of this.ioSocks) {
      generalLogger.debug(sock.selection);

      if (sock.selection === id) {
        sock.imgIndex++;
      }
      else if (sock.selection === 'none') {
        generalLogger.debug("%s: img index %d results in id %s and given id is %s", this.examCode, sock.imgIndex, this.students[sock.imgIndex], id);

        if (this.students[sock.imgIndex] === id) {
          this.imgCallback(sock, false, this.conns[this.students[sock.imgIndex]].currentImg());
        }
      }

    }
  }


  imgCallback(sock, err, data) {
    if (err) {
      if (err instanceof EvalError) {
        //No need to do anything.
        sock.imgIndex = 0;
        generalLogger.debug('No images');
      }
      else if (err instanceof RangeError) {
        generalLogger.debug('Range error caught!');

        sock.imgIndex = 0;
        if (sock.selection === 'none') {
          this.nextImg(sock, sock.imgIndex, this.imgCallback);
        }
        else {
          this.conns[sock.selection].nextImage(sock, sock.imgIndex, this.imgCallback);
        }
      }
      else {
        generalLogger.serverError(err.stack);
        generalLogger.debug(err.stack);
      }
    }
    else {
      generalLogger.debug('%s: Sending image.', this.examCode);
      sock.emit('updateImage', data);
    }
  }

  fetchImage(sock, next) {
    //if next else prev
    if (next) sock.imgIndex++;
    else if (next === false) sock.imgIndex--;
    else {
      //Init
    }

    generalLogger.debug('%s: fetching next image', this.examCode);

    if (sock.selection === 'none') {
      this.nextImg(sock, sock.imgIndex, this.imgCallback);
    }
    else {
      this.conns[sock.selection].nextImage(sock, sock.imgIndex, this.imgCallback);
    }

  }

  nextImg(sock, index, cb) {
    generalLogger.debug('%s: next image with index %d.', this.examCode, index);

    if (this.students.length > 0) {
      generalLogger.debug(this.students.length);

      if (this.students.length - 1 < index || index < 0) cb(sock, RangeError());
      else {
        generalLogger.debug('%s: current image from %s.', this.examCode, this.students[index]);

        cb(sock, false, this.conns[this.students[index]].currentImg());
      }
    }
    else
      cb(sock, EvalError('No student connections'));
  }

  eVInit(sock) {
    generalLogger.debug('%s: init exam view connection.', this.examCode);

    sock.selection = 'none';
    sock.imgIndex = 0;

    generalLogger.debug('%s: sending student list.', this.examCode);

    sock.emit('updateStudents', { students: this.students });

    this.nextImg(sock, 0, this.imgCallback);

    //LogView
    sock.on('updateSelection', (info) => this.eVUpdSelection(sock, info));

    //ScreenShotView
    sock.on('nextImage', (info) => this.fetchImage(sock, info));
    sock.on('slideShow', (flag) => {
      try {
        if (flag) {
          sock.slideShow = setInterval(() => this.fetchImage(sock, true), 5000);
        }
        else {
          sock.slideShow = clearInterval(sock.slideShow);
        }
      }
      catch (err) {
        generalLogger.serverError(err.stack);
        generalLogger.debug(err.stack);
      }
    });

    //ControlPanel
    sock.on('changeList', (data) => {this.eVChangeList(data)});
    sock.on('changeTime', (data) => {this.eVChangeTime(data)});
    sock.on('changeEnd', (data) => {this.eVChangeEnd(data)});
    sock.on('sendCmd', (data) => {this.eVSendCmd(sock.selection, data)});
    sock.on('screenShotNow', () => {this.eVScreenShot(sock.selection)});

    this.eVChangeLog(sock);

    this.ioSocks.add(sock);
  }

  eVChangeList(data) {
    if (data.case === 'blacklist' || data.case === 'whitelist') {
      //Send changes to clients.
      try {
        const c = data.case;
        const addr = data.addr;
        const type = (data.type === 'add');


        for (const key of this.students) {
          this.conns[key][c](addr, type);
        }

      }
      catch (err) {
        generalLogger.debug(err.stack);
      }

      //Add changes to config.
      try {
        ( (data.type === 'add') ? this.config.addTo(data.case, data.addr) : this.config.removeFrom(data.case, data.addr) );
        generalLogger.serverInfo("%s %s to %s", ( ((data.type === 'add') ? "Added" : 'Removed') ), data.addr, data.case );
      }
      catch (err) {
        generalLogger.debug('Config error: %s', err.message);
      }
    }
    else {
      generalLogger.serverError('Undefined list case %s received.', data.case);
    }

  }


  eVChangeTime(time) {

    for (const key of this.students) {
      this.conns[key].updateInterval(time);
    }

    try {
      this.config.set('scrshInt', time);
      generalLogger.serverInfo("Set screenshot interval to %s", time );
    }
    catch (err) {
      generalLogger.debug('Config error: %s', err.message);
    }
  }

  eVChangeEnd(time) {

    for (const key of this.students) {
      this.conns[key].examEnd(time);
    }

    try {
      this.config.set('examEnd', time);
      generalLogger.serverInfo("Set exam end time to %s", time );
    }
    catch (err) {
      generalLogger.debug('Config error: %s', err.message);
    }
  }

  eVSendCmd(selection, data) {
    if (selection === 'none') {
      for (const key of this.students) {
        this.conns[key].sendCommand(data.cmd, data.type);
      }
    }
    else {
      this.conns[selection].sendCommand(data.cmd, data.type);
    }
  }

  eVScreenShot(selection) {
    if (selection === 'none') {
      for (const key of this.students) {
        this.conns[key].scrshtNow();
      }
    }
    else {
      this.conns[selection].scrshtNow();
    }
  }

  eVUpdStudents(student) {
    generalLogger.debug('Updating students');

    for (let sock of this.ioSocks) {
      sock.emit('updateStudents', { students: [student] });
    }
  }

  eVUpdSelection(sock, info) {

    let next = ((info.select) ? info.select : 'none');

    generalLogger.debug(info);

    sock.imgIndex = -1;

    generalLogger.debug('%s: HTTP client changing selection to %s.', this.examCode, next);

    try {
      sock.selection = next;

      //Send the log file of the new selection.
      this.eVChangeLog(sock);

      this.fetchImage(sock, true);

    }
    catch (err) {
      generalLogger.serverError(err.stack);
      generalLogger.debug(err.stack);
    }
  }

  //Send the updated log to the clients.
  eVUpdLog(transport, level, msg, meta, id) {
    for (let sock of this.ioSocks) {

      if (sock.selection === id) {
        sock.emit('updateLog', level, msg);
      }
    }
  }

  eVChangeLog(sock) {

    fs.readFile(((sock.selection === 'none') ? generalLogger.path : this.conns[sock.selection].logger.path), 'utf8', (err, data) => {
      if (err) {
        fs.readFile(generalLogger.path, 'utf8', (err, data) => {
          if (err) generalLogger.serverError(err.stack);
          let tmp = data.split('\n');
          tmp.pop();

          sock.emit('changeLog', tmp.reverse().join('\n'));
        });
      }
      let tmp = data.split('\n');
      tmp.pop();

      sock.emit('changeLog', tmp.reverse().join('\n'));
    });

  }


  //override super close
  //Close Students and remove them
  //Close Http sockets.
  async close() {
    try {
      this.wsClose();
      this.server.close();

      this.doc.active = false;

      await this.doc.save().catch((err) => {generalLogger.serverError(err.stack)});

      generalLogger.serverInfo('Exam closes.');

      for (let studId in this.conns) {

        this.conns[studId].close();
        delete this.conns[studId];
      }
    }
    catch (err) {
      generalLogger.serverError("Error whilst closing:", err.stack);
    }
  }


}

module.exports = Exam;
