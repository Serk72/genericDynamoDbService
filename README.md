# genericDynamoDbService
[![GitHub Release](https://img.shields.io/github/release/Serk72/genericDynamoDbService.svg?logo=github)](https://github.com/Serk72/genericDynamoDbService/releases)
[![Build Status](https://github.com/Serk72/genericDynamoDbService/actions/workflows/main.yml/badge.svg)](https://github.com/Serk72/genericDynamoDbService/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/Serk72/genericDynamoDbService/blob/main/LICENSE)
[![Coverage Status](https://codecov.io/github/Serk72/genericDynamoDbService/branch/main/graph/badge.svg)](https://codecov.io/github/Serk72/genericDynamoDbService)
[![CodeQL](https://github.com/Serk72/genericDynamoDbService/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Serk72/genericDynamoDbService/actions/workflows/codeql-analysis.yml)
[![Downloads](https://img.shields.io/github/downloads/Serk72/genericDynamoDbService/total?logo=github)](https://github.com/Serk72/genericDynamoDbService/releases)

Generic Configurable Dynamo DB node JS service

## Deployed documentation

see [here](exampleDoc)

## Running tests

To run tests with mocked dynamodb service simply run
```bash
npm run test
```

To run with an actual dynamodb service. ensure you have your [aws cli configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) 

edit the [test config](./config/test.json) to conatin 
```json
"test": {
    "mock": false
  },
```
Ensure the table in the test config exists in your aws account
it can be created with the following command:
```bash
aws dynamodb create-table \
    --table-name testInfo \
    --attribute-definitions \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=email,KeyType=HASH 
```

Tests can then be run with 
```bash
npm run test
```

## Setup Instuctions

### Config
This application is configured using https://github.com/node-config/node-config and can be changed to use `local.json` files for local config or `NODE_ENV` config files.
#### Config File

| Config name                    | JSON Type | Description | Default |
|--------------------------------|-----------|-------------|---------|
| `server.port`                  | Int       | The port the api will run on. | `8000` |
| `server.version`               | String    | The version identifier for the endpoint. | `v1` |
| `dynamodb.tableName`           | String    | The DynamoDb table name to query. | `userInfo` |
| `dynamodb.defaultLimt`         | Int       | The default number of items to return from the `/userInfo` endpoint when listing all users. This value will be used only when no `limit` parameter is sent to the endpoint. | `10` | 
| `dynamodb.maxLimit`            | Int       | The maximum allowed limit.                               | `1000` |
| `dynamodb.removeNulls`         | Boolean   | If null values should be removed from the info objects   | `true` |
| `primaryKey`                   | String    | The primary key for the dynamodb table.                  | `email` |
| `infoType`                     | String    | Identifier that will be logged indicating data type.  | `User` |
| `aws.region`                   | String    | The aws region to run in.                            | `us-east-1` |
| `test.mock`                    | Boolean   | Determins if the dynamodb should be mocked for test of it it will use the actual dynamodb table. | `true` |

#### Example Config
```json
{
    "server": {
      "port": 8000,
      "version": "v1"
    },
    "test": {
        "mock": true
    },
    "dynamodb": {
        "tableName": "userInfo",
        "defaultLimt": 10,
        "maxLimit": 1000,
        "removeNulls": true,
        "primaryKey": "email",
        "infoType": "User",
        "schema": {
          "type": "object",
          "description": "Adds new user info",
          "additionalProperties": true,
          "required": ["email"],
          "properties": {
              "email": {
                  "type": "string"
              },
              "phoneNumber": {
                  "type": ["string", "null"]
              },
              "firstName": {
                  "type": "string"
              },
              "middleInitial": {
                  "type": ["string", "null"]
              },
              "lastName": {
                  "type": "string"
              },
              "gender": {
                  "type": ["string", "null"],
                  "enum": [null, "male", "female", "non-binary", "transgender", "intersex"],
                  "transform": ["toLowerCase"]
              }
          }
      }
    },
    "aws": {
      "region": "us-east-1"
    }
}
```
# Run Locally
```bash
npm install
npm start
```

# Deploy Manually
```bash
npm run deploy
```
