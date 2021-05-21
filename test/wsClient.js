const { createToken, verifyToken } = require("konekoe-server-utils");
const WebSocket = require("ws");

const { 
  JWT_PRIVATE,
  JWT_PUBLIC,
  TOKEN_SIGN_OPTIONS,
  TOKEN_VERIFY_OPTIONS 
} = require("../src/utils/Config.js");
 
const ws = new WebSocket("ws://localhost:4000");
ws.on("open", function open() {
  ws.send(JSON.stringify({ type: "server_connect", payload: { token: createToken({ studentId: "12345" }, JWT_PRIVATE, TOKEN_SIGN_OPTIONS), hwid: 1 } }));
});
 
ws.on("message", function incoming(data) {
  console.log(data, "\n");
});