/**
 * Handler interface used to represent a CRUD endpoint.
 */
class Handler {
  schema = {};
  /**
   * Default constructor that will check for required items.
   */
  constructor() {
    if (!this.routes) {
      throw new Error('Handlers must have routes');
    }
    if (!this.version) {
      throw new Error('Handlers must have a version');
    }
  }
}

module.exports = Handler;
