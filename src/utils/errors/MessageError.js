class MessageError extends Error {
  constructor(message = "Invalid message") {
    super(message);

    this.message = message;
    this.name = "MessageError";
  }
};

module.exports = MessageError;
