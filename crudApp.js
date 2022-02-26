const Server = require('./src/server');

process.on('uncaughtException', (error) => {
  console.error(`Uncaught Exception: ${error}`, error);
  process.exit(1);
});
process.on('unhandledRejection', (error) => {
  console.error(`Unhandled Rejection: ${error}`, error);
  process.exit(1);
});

const server = new Server();

server.start();
