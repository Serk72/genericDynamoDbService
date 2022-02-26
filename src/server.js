const express = require('express');
const config = require('config');
const handlers = require('./handlers');
const cors = require('cors');
const bodyParser = require('body-parser');
const port = config.get('server.port');
const corsOptions = {
  methods: ['CREATE', 'GET', 'UPDATE', 'DELETE'],
};
/**
 * Starts a CRUD service.
 */
module.exports = class Server {
  /**
   * Constructor.
   */
  constructor() {
    this._app = express()
        .options('*', cors(corsOptions))
        .use(cors(corsOptions))
        .use(bodyParser.json());
  }

  /**
     * Format error messages and send back to the client.
     * @param {*} error error message object.
     * @param {*} request Object containing request information.
     * @param {*} response Object contatining response information.
     * @param {*} next Function for going to the next handler.
     */
  errorHandler(error, request, response, next) {
    if (error) {
      if (typeof error.message == 'object') {
        console.error(`Error: ${JSON.stringify(error.message)}`);
      } else {
        console.error(error);
      }
      let errorCode = error.code || error.statusCode || 500;
      let errorMessage = error.message || 'Internal Server Error Processing Request.';
      if (errorCode < 100 || errorCode > 530) {
        errorCode = 500;
        errorMessage = 'Internal Server Error Processing Request.';
      }
      response.status(errorCode).send({error: errorMessage});
    } else {
      next(null);
    }
  }

  /**
   * Starts the CRUD service.
   * @param {boolean} skipListen if starting the listen will be skipped.
   * @return {Promise} promise resolving when the server has started.
   */
  start(skipListen = false) {
    handlers(this._app);
    this._app.use(this.errorHandler);
    if (!skipListen) {
      this._server = this._app.listen(port);
      return new Promise((resolve, reject) => {
        this._server.once('error', (error) => {
          console.error(error);
          reject(new Error('Unable to start Server.'));
        });
        this._server.once('listening', () => {
          console.log(`Server Started on port ${port}`);
          resolve();
        });
      });
    }
  }

  /**
   * Stops the service.
   */
  stop() {
    this._server.close();
  }
};
