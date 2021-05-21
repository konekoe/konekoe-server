process.READY_TO_EXIT = {
  error: false,
  examDb: false,
  authKeyDb: false,
  examStart: false,
  wsServer: false,
  exitAttempts: 0,
  maxExitAttempts: 5,
  processIsReady() {
    return this.error || this.exitAttempts >= this.maxExitAttempts || ( this.examDb && this.authKeyDb && this.examStart && this.wsServer );
  },
  update(key, state) {
    this[key] = state;

    if (this.processIsReady())
      console.log("Process is ready for a clean exit.");
  }
};

const main = async () => {
  const { generalLogger } = require('konekoe-server-log');
  const { PORT, EXAMCODE, ROOT_KEY, ROOT_CERT, DAEMON_CERT } = require("./src/utils/Config.js");
  const { MongoConnection, examModels, authKeyModels } = require('konekoe-database');

  try {
    process.examDb = await MongoConnection(process.env.EXAM_DATABASE_URI);
    generalLogger.serverInfo("Connected to exam database");
    process.READY_TO_EXIT.update("examDb", true);

    process.authKeyDb = await MongoConnection(process.env.AUTH_KEY_DATABASE_URI);
    generalLogger.serverInfo("Connected to key database");
    process.READY_TO_EXIT.update("authKeyDb", true);
  }
  catch (err) {
    generalLogger.serverError(err.stack);
    process.exit(1);
  }

  ["SIGINT", "SIGHUP", "SIGTERM"].forEach((value) => process.on(value, async () => {
    if (!process.READY_TO_EXIT.processIsReady()) {
      generalLogger.serverInfo("Server state not yet ready to exit.");

      setTimeout(() => {
        process.READY_TO_EXIT.exitAttempts++;
        generalLogger.serverInfo(`${ process.READY_TO_EXIT.exitAttempts }/${ process.READY_TO_EXIT.maxExitAttempts } exit attempts made.`);
        process.emit("SIGHUP", 1);
      }, 5000);
      return;
    }

    generalLogger.debug("Signal received");

    //Close active connections.
    await Promise.all((Array.from(msgHandlers)).map(async s => s.close()));
    await Promise.all((Object.values(students)).map(async s => s.close()));

    try {
      await services.endExam(EXAMCODE);
    }
    catch (err) {
      generalLogger.serverError(err.stack);
    }

    await new Promise(resolve => { return wss.close(() => resolve(generalLogger.serverInfo('WebSocket server closes.'))) });
    await new Promise(resolve => { return wsServer.close(() => resolve(generalLogger.serverInfo('Https server closes.'))) });
    await new Promise(resolve => { return process.examDb.close(() => resolve(generalLogger.serverInfo('exam database connection closed.'))) });
    await new Promise(resolve => { return process.authKeyDb.close(() => resolve(generalLogger.serverInfo('key database connection closed.'))) });
    
    process.exit(0);
  }));

  examModels(process.examDb);
  authKeyModels(process.authKeyDb);
  
  const { MessageHandler, Student, Teacher } = require('./src/utils');
  const services = require('./src/services').exam;
  const WebSocket = require('ws');
  const https = require('https');


  const getMyIp = async () => {
    const options = {
      host: 'ipv4bot.whatismyipaddress.com',
      port: 443,
      path: '/'
    };

    return new Promise((resolve, reject) => {
      https.get(options, function(res) {
        res.on("data", function(chunk) {
          resolve(chunk.toString());
        });
      }).on('error', function(err) {
        reject(err);
      });
    });
  };

  generalLogger.debug("Server running...");

  generalLogger.on("logged", (msg) => console.log(msg))

  const msgHandlers = new Set();
  const students = {};
  const teachers = new Set();

  try {
    const ip = await getMyIp();
  
    generalLogger.debug(`My ip is: ${ ip }`);
    var [examDoc, changeStream] = await services.startExam(EXAMCODE, ip, PORT);
    
    //Update configs dynamically
    changeStream.on('change', async data => {
      if (data.documentKey._id.toString() === examDoc.config._id.toString()) {

        generalLogger.debug("Config update");

        try {
          examDoc = await services.getExam(EXAMCODE);
          
          msgHandlers.forEach(handler => handler.setConfig(data.updateDescription.updatedFields));
          
          for (let id in students) {
            students[id].msgHandler.setConfig(data.updateDescription.updatedFields);
          }

        }
        catch (err) {
          generalLogger.serverError(err.stack);
        }
      }
    });

    changeStream.on('close', () => generalLogger.serverInfo("change stream closes"));

    generalLogger.serverInfo(`Exam with code ${ EXAMCODE } started.`);
  }
  catch (err) {
    generalLogger.serverError(`Error fetching config: ${ err.stack }`);
    process.READY_TO_EXIT.update("error", true);
    process.emit("SIGHUP", 1);
  } 

  const getStudents = () => Object.values(students).map(s => s.toJSON());

  const serverOption = {
    requestCert: true,
    ca: [ DAEMON_CERT ],
    cert: ROOT_CERT,
    key: ROOT_KEY
  };

  var wsServer = https.createServer(serverOption);

  const options = {
    server: wsServer
  };

  var wss = new WebSocket.Server(options);

  wss.on('connection', (sock, req) => {
    generalLogger.serverInfo(`${ req.connection.remoteAddress } connected`);

    let newHandler = new MessageHandler(sock, req.connection.remoteAddress, examDoc);

    msgHandlers.add(newHandler);

    newHandler.on('student', ({ studentDoc, hwid }) => {
      msgHandlers.delete(newHandler);
      newHandler.removeAllListeners('close');

      if (students[studentDoc.studentId]) {
        students[studentDoc.studentId].replace(newHandler, hwid);
      }
      else {
        const newStud = new Student(studentDoc, hwid, newHandler, examDoc);
        students[studentDoc.studentId] = newStud;

        const handleUpdates = () => {
          generalLogger.debug("Student updated");
          teachers.forEach(t => t.updateStudents(newStud.toJSON()));
        };

        newStud.on('close', handleUpdates);
        newStud.on('open', handleUpdates);
        handleUpdates();
      }
    });

    newHandler.on('teacher', ({ log }) => {
      msgHandlers.delete(newHandler);
      newHandler.removeAllListeners('close');

      const newTeacher = new Teacher(newHandler, getStudents(), log);

      teachers.add(newTeacher);

      newTeacher.on('close', () => {
        teachers.delete(newTeacher);
      });

      newTeacher.on('change_logger', (id) => newTeacher.updateLogger((id) ? students[id].logger : generalLogger));

    });

    newHandler.on('close', () => {
      generalLogger.serverInfo(`${ req.connection.remoteAddress } disconnected`);
      msgHandlers.delete(newHandler);
    });
  });

  //These are mainly for registering TLS related errors.
  wss.on('error', (err) => {
    generalLogger.serverError(err.stack);
    process.READY_TO_EXIT.error = true;
  });

  wsServer.on('tlsClientError', (err) => {
    generalLogger.serverError(err.stack);
  });

  wsServer.on('authorizationError', (err) => {
    generalLogger.serverError(err.stack);
  });

  wsServer.listen(PORT, () => {
    generalLogger.serverInfo(`WebSocket server listening on port ${ PORT }`);
    process.READY_TO_EXIT.update("wsServer", true);
  });

};


main();