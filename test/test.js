
const io = require('socket.io-client');
const assert = require('assert');
const net = require('net');

var ioc = io('http://localhost:8080');

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

describe('Test daemon-server interface.', function() {
  var client;

  beforeEach(function() {
    // runs before all tests in this block
    client = new net.Socket();
    client.connect({ port: 9002},
      function() {
        let studentID = getRandomInt(999999);
        let examCode = "#12552gwer";
        let msg = examCode + ";" + studentID;

        client.write("CONN0");
        var length_buf = new Buffer(4);
        length_buf.writeUInt32BE(msg.length, 0);
        client.write(length_buf);
        client.write(msg);
      });
    });

    describe('test TMREQ with 1', function() {
      it('socket should respond with TMRSP', function() {
        client.on('data', function(data){
          let dateReceived = data.toString().slice(9);
          let dateCorrect = new Date();
          assert.equal(data.toString('utf8').slice(0, 5), "TMRSP");
          assert.equal(data.readUIntBE(5, 4), data.toString().slice(9).length);
          assert.equal(dateReceived, (dateCorrect.getUTCDate() + '.' + (dateCorrect.getUTCMonth() + 1) + '.' + dateCorrect.getUTCFullYear() + ' ' + dateCorrect.getUTCHours() + ":" + dateCorrect.getUTCMinutes()).toString('ascii'));
        });
      });
    });


    describe('test CONN0 with 1', function() {
      it('socket should respond with ACCPT', function() {
        client.on('data', function(data){
          assert.equal(data.toString('utf8').slice(0, 5), "ACCPT");
          assert.equal(data.readUIntBE(5, 4), data.toString().slice(9).length);
        });
      });
    });

    describe('test CONN0 with 1', function() {
      it('socket should respond with REJCT', function() {
        client.on('data', function(data){
          assert.equal(data.toString('utf8').slice(0, 5), "REJCT");
        });
      });
    });

  afterEach(function() {
    client.end();
  });
});

describe('Test Exam Viewer - server interface', function() {
  before(function() {
    // runs before all tests in this block
    client = new net.Socket();
    client.connect({ port: 9002},
      function() {
        let studentID = getRandomInt(999999);
        let examCode = "#12552gwer";
        let msg = examCode + ";" + studentID;
        let date = new Date();

        //Change the selection to this test student.
        ioc.emit('updateSelection', { course: 'ELEC-A7100',
                                     date: date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear(),
                                     id: studentID
                                   });

        client.write("CONN0");
        var length_buf = new Buffer(4);
        length_buf.writeUInt32BE(msg.length, 0);
        client.write(length_buf);
        client.write(msg);
      });
    });

    describe('test changes to blacklist/whitelist', function() {
      it('socket should respond with ADDWL', function() {
        ioc.emit('changeConf', {addr: "www.testi.fi", case: "whitelist", type: "add"});

        client.on('data', function(data){
          assert.equal(data.toString('ascii').slice(0, 5), "ADDWL");
          assert.equal(data.toString('ascii').slice(9), "www.testi.fi");
        });
      });

      it('socket should respond with REMWL', function() {
        ioc.emit('changeConf', {addr: "www.testi.fi", case: "whitelist", type: "remove"});

        client.on('data', function(data){
          assert.equal(data.toString('ascii').slice(0, 5), "REMWL");
          assert.equal(data.toString('ascii').slice(9), "www.testi.fi");
        });
      })
    });

    it('socket should respond with ADDBL', function() {
      ioc.emit('changeConf', {addr: "www.testi.fi", case: "blacklist", type: "add"});

      client.on('data', function(data){
        assert.equal(data.toString('ascii').slice(0, 5), "ADDBL");
        assert.equal(data.toString('ascii').slice(9), "www.testi.fi");
      });
    });

  it('socket should respond with REMBL', function() {
    ioc.emit('changeConf', {addr: "www.testi.fi", case: "blacklist", type: "remove"});

    client.on('data', function(data){
      assert.equal(data.toString('ascii').slice(0, 5), "REMBL");
      assert.equal(data.toString('ascii').slice(9), "www.testi.fi");
    });
  });

    after(function() {
      client.end();
      ioc.close();
    });
});
