const awsServerlessExpress = require('aws-serverless-express');
const Server = require('./src/server');
const server = new Server();
server.start(true);
const serverlessServer = awsServerlessExpress.createServer(server._app);


module.exports.universal = (event, context) => awsServerlessExpress.proxy(serverlessServer, event, context);
