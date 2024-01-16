const mongoose = require("mongoose");
const mssql = require("mssql");
const { Client } = require("pg");
const { MongoClient } = require("mongodb");

class Database {
  async connectToDatabase(dbInfo) {
    switch (dbInfo.type) {
      case "mongodb":
        //if exist dbInfo.uri, use it
        if (dbInfo.uri) {
          const database = dbInfo.uri.split("/");
          const dbName = database[database.length - 1];
          // Create a new MongoClient
          const client = new MongoClient(dbInfo.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          });
          await client.connect();
          const collectionNamesObject = await client
            .db(dbName)
            .listCollections()
            .toArray();
          const collectionNames = collectionNamesObject.reduce(
            (obj, collection) => {
              obj[collection.name] = true;
              return obj;
            },
            {}
          );
          const connection = {
            type: "mongodb",
            uri: dbInfo.uri,
            status: "connected",
            tables: JSON.stringify(collectionNames),
            dbname: dbName,
          };
          return connection;
        } else {
          const client = new MongoClient(
            `mongodb+srv://${dbInfo.username}:${dbInfo.password}@${dbInfo.host}/${dbInfo.databaseName}`,
            {
              useNewUrlParser: true,
              useUnifiedTopology: true,
            }
          );
          await client.connect();
          const collectionNamesObject = await client
            .db(dbInfo.databaseName)
            .listCollections()
            .toArray();
          const collectionNames = collectionNamesObject.reduce(
            (obj, collection) => {
              obj[collection.name] = true;
              return obj;
            },
            {}
          );
          console.log("Mongodb connected successfully");
          const connection = {
            type: "mongodb",
            username: dbInfo.username,
            password: dbInfo.password,
            host: dbInfo.host,
            dbname: dbInfo.databaseName,
            port: dbInfo.port,
            tables: JSON.stringify(collectionNames),
            status: "connected",
          };
          return connection;
        }
      case "mssql": {
        const client = await mssql.connect({
          user: dbInfo.user,
          password: dbInfo.password,
          server: dbInfo.host,
          database: dbInfo.databaseName,
          port: parseInt(dbInfo.port),
        });
        const connection = {
          type: "mssql",
          username: dbInfo.username,
          password: dbInfo.password,
          host: dbInfo.host,
          dbname: dbInfo.databaseName,
          port: dbInfo.port,
          status: "connected",
        };
        return connection;
      }
      case "postgre": {
        const client = new Client({
          user: dbInfo.username,
          host: dbInfo.host,
          database: dbInfo.databaseName,
          password: dbInfo.password,
          port: parseInt(dbInfo.port),
        });
        await client.connect();
        const res = await client.query(`
            SELECT table_name FROM information_schema.tables WHERE table_schema='public'
          `);
        console.log("res:", res);
        const tables = res.rows.map((row) => row.table_name);
        const tableNames = tables.reduce((obj, table) => {
          obj[table] = true;
          return obj;
        }, {});
        console.log("tables:", tableNames);
        const connection = {
          type: "postgre",
          username: dbInfo.username,
          password: dbInfo.password,
          host: dbInfo.host,
          dbname: dbInfo.databaseName,
          port: dbInfo.port,
          tables: JSON.stringify(tableNames),
          status: "connected",
        };
        return connection;
      }
    }
  }
}
module.exports = new Database();
