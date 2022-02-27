process.env.NODE_ENV = 'test';

const config = require('config');
const chai = require('chai');
const chaiHttp = require('chai-http');
const Server = require('../src/server');
const assert = require('assert');

const endpointName = config.get('dynamodb.tableName');
const version = config.get('server.version');
const mockDynamo = config.get('test.mock');
const AWS = require('aws-sdk-mock');
const tableName = config.get('dynamodb.tableName');
const primaryKey = config.get('dynamodb.primaryKey');
const axios = require('axios');


// eslint-disable-next-line no-unused-vars
const should = chai.should();
let server;
chai.use(chaiHttp);
const itemMap = {};
describe('Info Object Service', () => {
  /**
   * Start Server and mock dynamo if required.
   */
  before((done) => {
    if (mockDynamo) {
      AWS.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
        assert.equal(tableName, params?.TableName);
        const limit = params.Limit;
        if (params.ExclusiveStartKey) {
          let LastEvaluatedKey;
          if (limit + params.ExclusiveStartKey < Object.values(itemMap).length) {
            LastEvaluatedKey = limit + params.ExclusiveStartKey + 1;
          }
          callback(null, {LastEvaluatedKey, Items: Object.values(itemMap).slice(LastEvaluatedKey, limit + params.ExclusiveStartKey)});
        } else {
          let LastEvaluatedKey;
          if (limit < Object.values(itemMap).length) {
            LastEvaluatedKey = limit + 1;
          }
          callback(null, {LastEvaluatedKey, Items: Object.values(itemMap).slice(0, limit)});
        }
      });
      AWS.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
        assert.equal(tableName, params?.TableName);
        callback(null, {Item: itemMap[params.Key[primaryKey]]});
      });
      AWS.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
        assert.equal(tableName, params?.TableName);
        assert.notEqual(null, params.Item[primaryKey]);
        itemMap[params.Item[primaryKey]] = params.Item;
        callback(null, {Item: itemMap[params.Item[primaryKey]]});
      });
      AWS.mock('DynamoDB.DocumentClient', 'delete', (params, callback) => {
        assert.equal(tableName, params?.TableName);
        delete itemMap[params.Key[primaryKey]];
        callback(null, 'success');
      });
    }
    server = new Server();
    server.start()
        .then(() => {
          done();
        });
  });

  /**
   * Stop server and mock.
   */
  after((done) => {
    if (mockDynamo) {
      AWS.restore('DynamoDB.DocumentClient');
    }
    server.stop();
    done();
  });

  /*
   * Test the /GET route with no users.
   */
  describe(`/GET ${endpointName}`, () => {
    it('it should GET all the info objects when there are none.', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('array');
            res.body.length.should.be.eql(0);
            done();
          });
    });
    it('Fail when limit NaN', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}?limit=sdfs`)
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('Fail when limit negative', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}?limit=-1`)
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('Fail when limit greater than max', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}?limit=5000`)
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
  });

  /*
   * Test the /GET route
   */
  describe(`/GET ${endpointName}/randomUser`, () => {
    it('it should GET fail with 404 to get a random user.', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}/randomUser`)
          .end((err, res) => {
            res.should.have.status(404);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
  });

  /*
   * Test the /POST route
   */
  describe(`/POST ${endpointName}`, () => {
    it('it should POST fail with 400 to add a user without an id field.', (done) => {
      chai.request(server._app)
          .post(`/${version}/${endpointName}`)
          .send({name: 'Hello'})
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('it should POST fail with 400 to add info with an empty id field.', (done) => {
      chai.request(server._app)
          .post(`/${version}/${endpointName}`)
          .send({
            name: 'Hello',
            [primaryKey]: '    ',
          })
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('it should POST suceed with valida data.', (done) => {
      chai.request(server._app)
          .post(`/${version}/${endpointName}`)
          .send({
            name: 'Hello',
            [primaryKey]: 'test1234@gmail',
            other: null,
          })
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
    it('it should POST fail with valida data when already exists.', (done) => {
      chai.request(server._app)
          .post(`/${version}/${endpointName}`)
          .send({
            name: 'Hello',
            [primaryKey]: 'test1234@gmail',
          })
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('it should DELETE user with success.', (done) => {
      chai.request(server._app)
          .delete(`/${version}/${endpointName}/test1234@gmail`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
  });

  /*
   * Test the /DELETE route
   */
  describe(`/DELETE ${endpointName}/randomUser`, () => {
    it('it should DELETE A  non existing user with success.', (done) => {
      chai.request(server._app)
          .delete(`/${version}/${endpointName}/randomUser`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
  });

  /*
   * Test the /Update route
   */
  describe('/Update', () => {
    it('Fail when id does not exist.', (done) => {
      chai.request(server._app)
          .put(`/${version}/${endpointName}/randomUser`)
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('it should POST suceed with valida data.', (done) => {
      chai.request(server._app)
          .post(`/${version}/${endpointName}`)
          .send({
            name: 'Hello',
            [primaryKey]: 'test1234@gmail',
            other: null,
          })
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
    it('Suceed when exists', (done) => {
      chai.request(server._app)
          .put(`/${version}/${endpointName}/test1234@gmail`)
          .send({
            newData: 'newData',
            otherData: 'other',
          })
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
    it('Fails with empty object', (done) => {
      chai.request(server._app)
          .put(`/${version}/${endpointName}/test1234@gmail`)
          .send({})
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('Suceed to remove null', (done) => {
      chai.request(server._app)
          .put(`/${version}/${endpointName}/test1234@gmail`)
          .send({
            otherData: null,
          })
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });

    it('Suceed to rename id value', (done) => {
      chai.request(server._app)
          .put(`/${version}/${endpointName}/test1234@gmail`)
          .send({
            [primaryKey]: 'new@mail',
          })
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
    it('it should confirm entry info', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}/new@mail`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property(primaryKey).eql('new@mail');
            res.body.should.have.property('newData').eql('newData');
            res.body.should.not.have.property('otherData');
            done();
          });
    });
    it('it should confirm entry rename', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}/test1234@gmail`)
          .end((err, res) => {
            res.should.have.status(404);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('it should POST suceed with valida data.', (done) => {
      chai.request(server._app)
          .post(`/${version}/${endpointName}`)
          .send({
            name: 'Hello',
            [primaryKey]: 'test1234@gmail',
            other: null,
          })
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
    it('Fail to rename id value when rename value exists', (done) => {
      chai.request(server._app)
          .put(`/${version}/${endpointName}/test1234@gmail`)
          .send({
            [primaryKey]: 'new@mail',
          })
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('error');
            done();
          });
    });
    it('it should delete entry info', (done) => {
      chai.request(server._app)
          .delete(`/${version}/${endpointName}/new@mail`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
    it('it should delete entry info', (done) => {
      chai.request(server._app)
          .delete(`/${version}/${endpointName}/test1234@gmail`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
  });

  /*
   * Create update delete item.
   */
  describe(`Create Update Delete item.`, () => {
    it('it should create a new entry', (done) => {
      chai.request(server._app)
          .post(`/${version}/${endpointName}`)
          .send({[primaryKey]: 'testemail@mail'})
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
    it('it should update the entry', (done) => {
      chai.request(server._app)
          .put(`/${version}/${endpointName}/testemail@mail`)
          .send({firstName: 'Tester'})
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
    it('it should confirm entry info', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}/testemail@mail`)
          .send({[primaryKey]: 'testemail@mail'})
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property(primaryKey).eql('testemail@mail');
            res.body.should.have.property('firstName').eql('Tester');
            done();
          });
    });
    it('it should delete entry info', (done) => {
      chai.request(server._app)
          .delete(`/${version}/${endpointName}/testemail@mail`)
          .send({[primaryKey]: 'testemail@mail'})
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('success');
            done();
          });
    });
  });

  /*
   * Test the /DELETE route
   */
  describe(`Create List Get and Delete 100 random users`, () => {
    let users;
    before('Gather user Info.', (done) => {
      axios.get('https://randomuser.me/api/?results=100&seed=8934759832742938')
          .then((res) => {
            users = res.data.results;
            done();
          })
          .catch((error) => {
            console.error(error);
          });
    });
    it('it should create 100 random users.', (done) => {
      const creates = [];
      users.forEach((user) => {
        creates.push(new Promise((resolve, reject) => {
          try {
            chai.request(server._app)
                .post(`/${version}/${endpointName}`)
                .send(user)
                .end((err, res) => {
                  res.should.have.status(200);
                  res.body.should.be.a('object');
                  res.body.should.have.property('success');
                  resolve();
                });
          } catch (exception) {
            reject(exception);
          }
        }));
      });
      Promise.all(creates).then(() => done());
    });

    it('it should GET all the 100 info objects.', (done) => {
      chai.request(server._app)
          .get(`/${version}/${endpointName}`)
          .query({limit: 200})
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('array');
            res.body.length.should.be.eql(100);
            done();
          });
    });
    it('it should delete 100 random users.', (done) => {
      const creates = [];
      users.forEach((user) => {
        creates.push(new Promise((resolve, reject) => {
          try {
            chai.request(server._app)
                .delete(`/${version}/${endpointName}/${user[primaryKey]}`)
                .send(user)
                .end((err, res) => {
                  res.should.have.status(200);
                  res.body.should.be.a('object');
                  res.body.should.have.property('success');
                  resolve();
                });
          } catch (exception) {
            reject(exception);
          }
        }));
      });
      Promise.all(creates).then(() => done());
    });
  });
});
