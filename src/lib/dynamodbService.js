const AWS = require('aws-sdk');
const config = require('config');
AWS.config.update({region: config.get('aws.region')});
const defaultLimit = config.get('dynamodb.defaultLimt');
const tableName = config.get('dynamodb.tableName');
const primaryKey = config.get('dynamodb.primaryKey');

module.exports = class DynamoDBService {
  /**
   * Constructor.
   */
  constructor() {
    this._dynamo = new AWS.DynamoDB.DocumentClient();
  }

  /**
   * Deletes the provided info id from the table
   * @param {string} key key for the info to delete.
   */
  async delete(key) {
    return this._dynamo.delete({
      TableName: tableName,
      Key: {
        [primaryKey]: key,
      },
    }).promise();
  }

  /**
   * Returns all info for the provided info id.
   * @param {string} key key for the info to get.
   * @return {object} Info Object.
   */
  async get(key) {
    return await this._dynamo
        .get({
          TableName: tableName,
          Key: {
            [primaryKey]: key,
          },
        })
        .promise();
  }

  /**
   * Updates or creates the provided key with the given info
   * @param {string} key key for the info to update.
   * @param {object} info Info JSON object.
   */
  async update(key, info) {
    return await this._dynamo
        .put({
          TableName: tableName,
          Item: {
            [primaryKey]: key,
            ...info,
          },
        })
        .promise();
  }

  /**
     * Returns all info up to the specified limit.
     * @param {integer} limit max number of info objects to retireve.
     * @return {list} Info object list.
     */
  async getAllInfo(limit = defaultLimit) {
    const params = {
      TableName: tableName,
    };

    const infoList = [];
    let currentCount = 0;
    let scanItems;
    do {
      scanItems = await this._dynamo.scan({
        ...params,
        Limit: limit - currentCount,
      }).promise();
      scanItems?.Items?.forEach((info) => {
        infoList.push(info);
        currentCount++;
      });
      params.ExclusiveStartKey = scanItems.LastEvaluatedKey;
    } while (currentCount < limit && scanItems.LastEvaluatedKey !== undefined);

    return infoList;
  }
};
