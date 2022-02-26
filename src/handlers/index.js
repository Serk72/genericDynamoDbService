const AjvSchemaValidator = require('ajv');
const UserInfo = require('./dynamoCRUDService');
const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();

/**
 * Sets up the CRUD app service using the provided express service.
 * @param {*} server express app to add routes too.
 */
module.exports = (server) => {
  const ajvSchemaValidator = new AjvSchemaValidator({
    allErrors: true,
    removeAdditional: true,
    validateSchema: true,
  });
  require('ajv-keywords')(ajvSchemaValidator, 'transform');

  const handlers = [new UserInfo()];

  // Add route path handlers for each handler object.
  handlers.forEach((handler) => {
    Object
        .entries(handler.routes)
        .forEach(({0: route, 1: routeInfo}) => {
          const path = `/${handler.version}${route}`;
          Object
              .entries(routeInfo.methods)
              .forEach(({0: method, 1: functionHandler}) => {
                // Validate message body against an ajv schema if applicable.
                if (routeInfo.schema) {
                  const schemaValidator = ajvSchemaValidator.compile(routeInfo.schema);
                  router[method](path, (request, response, next) => {
                    if (['PUT', 'POST'].includes(request.method) && !schemaValidator(request.body)) {
                      const error = new Error();
                      error.message = schemaValidator.errors;
                      error.code = 400;
                      next(error);
                    } else {
                      next(null);
                    }
                  });
                }
                const errorWrapper = (request, response, next) => {
                  try {
                    return functionHandler.bind(handler)(request, response, next)
                        .catch((err) => {
                          console.error(err);
                          const error = new Error('Internal Server Error processing request.');
                          error.code = 500;
                          next(error);
                        });
                  } catch (err) {
                    console.error(err);
                    const error = new Error('Internal Server Error processing request.');
                    error.code = 500;
                    next(error);
                  }
                };
                // Associate handler function for route path.
                router[method](path, errorWrapper);
              });
        });
  });
  server.use('/', router);
};
