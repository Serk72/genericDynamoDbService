const DynamoDBService = require('../lib/dynamodbService');
const Handler = require('./handler');
const config = require('config');
const maxLimit = config.get('dynamodb.maxLimit');
const removeNulls = config.get('dynamodb.removeNulls');
const schema = config.get('dynamodb.schema');
const primaryKey = config.get('dynamodb.primaryKey');
const endpointName = config.get('dynamodb.tableName');
const infoType = config.get('dynamodb.infoType');
const version = config.get('server.version');
/**
 * Handler for the dynamoCRUDService endpoint. This endpoint is used to add, list, delete, and update objects.
 */
module.exports = class dynamoCRUDService extends Handler {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this._dynamoService = new DynamoDBService;
  }

  /**
   * Returns the current version of this handler.
   */
  get version() {
    return version;
  }

  /**
   * Returns info needed to build the route for the endpoint.
   */
  get routes() {
    return {
      [`/${endpointName}`]: {
        schema,
        methods: {
          get: this._getAllInfo,
          post: this._createInfo,
        },
      },
      [`/${endpointName}/:${primaryKey}`]: {
        schema: {
          ...schema,
          required: [],
        },
        methods: {
          put: this._updateInfo,
          get: this._getInfo,
          delete: this._deleteInfo,
        },
      },
    };
  }

  /**
   * Returns all info up until the limit provided.
   * @param {*} request Object containing request information.
   * @param {*} response Object contatining response information.
   * @param {*} next Function for going to the next handler.
   */
  async _getAllInfo(request, response, next) {
    let limit;
    if (request.query.limit) {
      limit = Number.parseInt(request.query.limit);
      if (!Number.isInteger(limit)) {
        const error = new Error('limit must be an integer value.');
        error.code = 400;
        next(error);
        return;
      } else if (limit < 0) {
        const error = new Error('limit must be a positive number.');
        error.code = 400;
        next(error);
        return;
      } else if (limit > maxLimit) {
        const error = new Error(`Limit cannot be greater than the maximum configure limit: ${maxLimit}`);
        error.code = 400;
        next(error);
        return;
      }
    }
    return this._dynamoService.getAllInfo(limit)
        .then((infoList) => response.status(200).send(infoList));
  }

  /**
   * Creates a new info entry
   * @param {*} request Object containing request information.
   * @param {*} response Object contatining response information.
   * @param {*} next Function for going to the next handler.
   */
  async _createInfo(request, response, next) {
    const info = request.body;
    if (info[primaryKey].trim() === '') {
      const error = new Error(`${primaryKey} is required and cannot be empty.`);
      error.code = 400;
      next(error);
      return;
    }
    const existingInfo = await this._dynamoService.get(info[primaryKey]);

    if (existingInfo?.Item) {
      const error = new Error(`${infoType} already exists with ${primaryKey}: ${info[primaryKey]}. Please use update endpoint to change ${infoType} info.`);
      error.code = 400;
      next(error);
      return;
    }
    if (removeNulls) {
      Object.keys(info).forEach((key) => {
        if (info[key] === null) {
          delete info[key];
        }
      });
    }
    return this._dynamoService.update(info[primaryKey], info)
        .then(() => response.status(200).send({success: `Added ${infoType} for ${primaryKey}: ${info[primaryKey]}`}));
  }

  /**
   * Gets existing info.
   * @param {*} request Object containing request information.
   * @param {*} response Object contatining response information.
   */
  async _getInfo(request, response) {
    const key = request.params[primaryKey];
    console.log(key);
    return this._dynamoService.get(key)
        .then((info) => {
          if (info?.Item) {
            response.status(200).send(info.Item);
          } else {
            response.status(404).send({error: `No ${infoType} found for ${primaryKey}: ${key}`});
          }
        });
  }

  /**
   * Updates the existing info.
   * @param {*} request Object containing request information.
   * @param {*} response Object contatining response information.
   * @param {*} next Function for going to the next handler.
   */
  async _updateInfo(request, response, next) {
    let key = request.params[primaryKey];
    const existingInfo = await this._dynamoService.get(key);
    if (!existingInfo?.Item) {
      const error = new Error(`${infoType} does not exist for ${primaryKey}: ${key}. Please use create endpoint to add new entries.`);
      error.code = 400;
      next(error);
      return;
    }

    let info = request.body;
    if (!info || Object.keys(info).length === 0) {
      const error = new Error(`Empty Update Object Recieved.`);
      error.code = 400;
      next(error);
      return;
    }

    if (info[primaryKey] && info[primaryKey] !== key) {
      const existingRenameInfo = await this._dynamoService.get(info[primaryKey]);
      // Check if an entry exists that the update entry wants to rename its primary key too.
      if (existingRenameInfo?.Item) {
        const error = new Error(`Cannot update ${infoType.toLowerCase()} with ${primaryKey}: ${key} to new ${primaryKey}: ${info[primaryKey]}. As ${info[primaryKey]} already exists.`);
        error.code = 400;
        next(error);
        return;
      }
      await this._dynamoService.delete(key);
      key = info[primaryKey];
    }

    // Populate existing items into update request.
    info = {
      ...existingInfo.Item,
      ...info,
    };
    if (removeNulls) {
      Object.keys(info).forEach((key) => {
        if (info[key] === null) {
          delete info[key];
        }
      });
    }
    return this._dynamoService.update(key, info)
        .then(() => response.status(200).send({success: `Updated ${infoType} for ${primaryKey}: ${key}`}));
  }

  /**
   * Gets deletes info if it exists.
   * @param {*} request Object containing request information.
   * @param {*} response Object contatining response information.
   */
  async _deleteInfo(request, response) {
    const key = request.params[primaryKey];
    return this._dynamoService.delete(key)
        .then(() => {
          response.status(200).send({success: `Removed ${primaryKey}: ${key}`});
        });
  }
};
