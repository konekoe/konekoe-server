class JsonWebTokenError extends Error {
  constructor(message = "Invalid token") {
    super(message);

    this.message = message;
    this.name = "TokenError";
  }
};

module.exports = JsonWebTokenError;
