require("dotenv").config();
const { readFileSync, readdirSync } = require("fs");
const { join } = require("path");

const env = process.env;

const PORT = env.PORT;

const EXAMCODE = env.EXAMCODE;

//Used in token verification.
const JWT_PRIVATE = readFileSync(join(env.JWT_PRIVATE));
const JWT_PUBLIC = readFileSync(join(env.JWT_PUBLIC));
const JWT_ISSUER = env.JWT_ISSUER;
const JWT_SUBJECT = env.JWT_SUBJECT;
const JWT_AUDIENCE = env.JWT_AUDIENCE;
const JWT_EXPIRESIN = env.JWT_EXPIRESIN;
const JWT_ALGORITHM = env.JWT_ALGORITHM;

const TOKEN_VERIFY_OPTIONS = {
  issuer: JWT_ISSUER,
  subject: JWT_SUBJECT,
  audience: JWT_AUDIENCE,
  expiresIn: JWT_EXPIRESIN,
  algorithm: [ JWT_ALGORITHM ]
};

const TOKEN_SIGN_OPTIONS = {
  issuer: JWT_ISSUER,
  subject: JWT_SUBJECT,
  audience: JWT_AUDIENCE,
  expiresIn: JWT_EXPIRESIN,
  algorithm: JWT_ALGORITHM
};

//Used for communication
const ROOT_CERT = readFileSync(env.ROOT_CERT);
const ROOT_KEY = readFileSync(env.ROOT_KEY);
const DAEMON_CERT = readFileSync(env.DAEMON_CERT);

module.exports = {
  PORT,
  EXAMCODE,
  TOKEN_SIGN_OPTIONS,
  TOKEN_VERIFY_OPTIONS,
  ROOT_KEY,
  ROOT_CERT,
  JWT_PUBLIC,
  JWT_PRIVATE,
  DAEMON_CERT
};
