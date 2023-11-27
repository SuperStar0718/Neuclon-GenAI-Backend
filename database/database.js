const mongoose = require('mongoose');
const mssql = require('mssql');
const { Client } = require('pg');
const { MongoClient } = require("mongodb");

class Database {

    async connectToDatabase(dbInfo) {
      switch(dbInfo.type) {
        case 'mongodb':
            //if exist dbInfo.uri, use it
            if(dbInfo.uri) {
              // Create a new MongoClient
              const client = new MongoClient(dbInfo.uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
              });
              await client.connect();
              const connection = {
                type: 'mongodb',
                uri: dbInfo.uri,
                status: 'connected',
              }
              return connection;
            }
            else {
              const client = new MongoClient(`mongodb+srv://${dbInfo.username}:${dbInfo.password}@${dbInfo.host}/${dbInfo.databaseName}`, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
              });
              await client.connect();
              console.log('Mongodb connected successfully')
              const connection ={
                type: 'mongodb',
                username: dbInfo.username,
                password: dbInfo.password,
                host: dbInfo.host,
                databaseName: dbInfo.databaseName,
                port: dbInfo.port,
                status: 'connected',
              }
              return connection;
            }
            break;
        case 'mssql':
          {
            const client = await mssql.connect({
              user: dbInfo.user,
              password: dbInfo.password,
              server: dbInfo.host,
              database: dbInfo.databaseName,
              port: parseInt(dbInfo.port),
            });
            const connection = {
              type: 'mssql',
              username: dbInfo.username,
              password: dbInfo.password,
              host: dbInfo.host,
              dbname: dbInfo.databaseName,
              port: dbInfo.port,
              status: 'connected',
            }
            return connection;
          }
        case 'postgre':
          {
            const client = new Client({
              user: dbInfo.username,
              host: dbInfo.host,
              database: dbInfo.databaseName,
              password: dbInfo.password,
              port: parseInt(dbInfo.port),
            });
            await client.connect();  
            const connection = {
              type: 'postgre',
              username: dbInfo.username,
              password: dbInfo.password,
              host: dbInfo.host,
              dbname: dbInfo.databaseName,
              port: dbInfo.port,
              status: 'connected',
            }
            return connection;
          }
      }
    }
}
module.exports = new Database();
