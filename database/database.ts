import { MongoClient } from "mongodb";
import mssql from "mssql";
import { Client } from "pg";

export const connectToDatabase = async (dbInfo: any) => {
  switch (dbInfo.type) {
    case "MongoDB":
    case "QuickBooks":
    case "SAP":
    case "Tulip":
    case "MasterControl":
    case "FedEx":
    case "ADP":
      //if exist dbInfo.uri, use it
      if (dbInfo.uri) {
        // Create a new MongoClient
        const client = new MongoClient(dbInfo.uri, {});
        await client.connect();
        const url = new URL(dbInfo.uri);
        const databasesList = await client.db().admin().listDatabases();
        console.log("databaselist:", databasesList);
        const databasesWithCollections = await Promise.all(
          databasesList.databases.map(async (database) => {
            const collectionsData = await client
              .db(database.name)
              .listCollections()
              .toArray();
            console.log("connection data:", database.name, collectionsData);
            const collections = await Promise.all(
              collectionsData.map(async (collection) => {
                const doc = await client
                  .db(database.name)
                  .collection(collection.name)
                  .findOne();
                const headers = doc ? Object.keys(doc) : [];
                console.log("headers:", headers);
                return {
                  collectionName: collection.name,
                  headers: headers.join(", "),
                  status: true,
                };
              })
            );
            return {
              name: database.name,
              collections: collections,
            };
          })
        );

        client.close();
        return {
          type: dbInfo.type,
          uri: dbInfo.uri,
          host: url.hostname,
          status: "connected",
          tables: JSON.stringify(databasesWithCollections),
        };
      } else {
        const client = new MongoClient(
          `mongodb+srv://${dbInfo.username}:${dbInfo.password}@${dbInfo.host}/${dbInfo.databaseName}`,
          {}
        );
        await client.connect();
        const databasesList = await client.db().admin().listDatabases();
        console.log("databaselist:", databasesList);
        const databasesWithCollections = await Promise.all(
          databasesList.databases.map(async (database) => {
            const collectionsData = await client
              .db(database.name)
              .listCollections()
              .toArray();
            const collections = collectionsData.map(async (collection) => {
              const doc = await client
                .db(database.name)
                .collection(collection.name)
                .findOne();
              const headers = doc ? Object.keys(doc) : [];
              return {
                collectionName: collection.name,
                headers: headers.join(", "),
                status: true,
              };
            });
            return {
              dbname: database.name,
              collections: collections,
            };
          })
        );

        console.log(databasesWithCollections);
        client.close();

        return {
          type: dbInfo.type,
          uri: dbInfo.uri,
          host: dbInfo.host,
          status: "connected",
          tables: JSON.stringify(databasesWithCollections),
        };
      }
    case "mssql": {
      const client = await mssql.connect({
        user: dbInfo.user,
        password: dbInfo.password,
        server: dbInfo.host,
        port: parseInt(dbInfo.port),
      });
      const connection = {
        type: "mssql",
        username: dbInfo.username,
        password: dbInfo.password,
        host: dbInfo.host,
        port: dbInfo.port,
        status: "connected",
      };
      client.close();
      return connection;
    }
    case "postgre": {
      const client = new Client({
        user: dbInfo.username,
        host: dbInfo.host,
        password: dbInfo.password,
        port: parseInt(dbInfo.port),
      });
      await client.connect();

      const DBNamesData = await client.query(
        "SELECT datname FROM pg_database WHERE datistemplate = false;"
      );
      let tableNames = [];

      for (let i = 0; i < DBNamesData.rows.length; i++) {
        const dbName = DBNamesData.rows[i].datname;
        const connection = new Client({
          user: dbInfo.username,
          host: dbInfo.host,
          password: dbInfo.password,
          port: parseInt(dbInfo.port),
          database: dbName,
        });

        await connection.connect();

        const res = await connection.query(`
            SELECT table_name FROM information_schema.tables WHERE table_schema='public'
          `);
        const tables = res.rows.map((row: any) => ({
          collectionName: row.table_name,
          status: true,
        }));
        tableNames.push({
          dbname: dbName,
          collections: tables,
        });
      }

      const connection = {
        type: "postgre",
        username: dbInfo.username,
        password: dbInfo.password,
        host: dbInfo.host,
        dbname: dbInfo.dbname,
        port: dbInfo.port,
        tables: JSON.stringify(tableNames),
        status: "connected",
      };
      return connection;
    }
  }
};
