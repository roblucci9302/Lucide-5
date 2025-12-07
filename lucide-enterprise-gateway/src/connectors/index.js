/**
 * Database Connectors
 * Unified interface for different database types
 */

const PostgreSQLConnector = require('./postgresql');
const MySQLConnector = require('./mysql');
const RESTConnector = require('./rest');

module.exports = {
    PostgreSQLConnector,
    MySQLConnector,
    RESTConnector
};
