const express = require("express");
const config = require("config");
const db = require("../../database/database");
const { MongoClient, ObjectId } = require("mongodb");
const { Client } = require("pg");
const mongoose = require("mongoose");
const mssql = require("mssql");

const Connection = require("../../models/Connection");

const router = express.Router();

// @route  POST api/users
// @desc   Register user
// @access Public
router.post("/connect", async (req, res) => {
  try {
    const connection = await db.connectToDatabase(req.body);

    console.log("connection:", connection);
    const response = await Connection.findOneAndReplace(
      { type: connection.type, host: connection.host },
      connection,
      {
        upsert: true,
        new: true,
      }
    );
    res.json(response);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

router.post("/connectTables", async (req, res) => {
  try {
    const connection = req.body;
    await Connection.findOneAndUpdate(
      { type: connection.type, host: connection.host },
      { $set: connection },
      {
        upsert: true,
      }
    );
    res.json(connection);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

router.get("/getAllConnections", async (req, res) => {
  try {
    const connections = await Connection.find();

    res.json(connections);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

router.post("/refreshConnection", async (req, res) => {
  try {
    console.log("req.body in refresh", req.body);
    const tableInfo = await Connection.findOne({
      type: req.body.type,
      host: req.body.host,
    });
    let dataSets = JSON.parse(tableInfo.tables);
    dataSets.forEach(async (dataSet) => {
      dataSet.collections.forEach(async (collection) => {
        if (collection.collectionName === req.body.dataset.collectionName)
          collection.status = true;
      });
    });

    const connection = await Connection.findOneAndUpdate(
      { type: req.body.type, host: req.body.host },
      { tables: JSON.stringify(dataSets) },
      { new: true }
    );

    res.json(connection);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

router.post("/stopConnection", async (req, res) => {
  try {
    console.log("req.body", req.body);
    const tableInfo = await Connection.findOne({
      type: req.body.type,
      host: req.body.host,
    });
    let dataSets = JSON.parse(tableInfo.tables);
    dataSets.forEach(async (dataSet) => {
      dataSet.collections.forEach(async (collection) => {
        if (collection.collectionName === req.body.dataset.collectionName)
          collection.status = false;
      });
    });
    const connection = await Connection.findOneAndUpdate(
      { type: req.body.type, host: req.body.host },
      { tables: JSON.stringify(dataSets) },
      { new: true }
    );
    console.log("req.body", connection);
    // const connection = await Connection.findOneAndReplace({type: req.body.type}, req.body, {upsert: true})
    console.log("disconnected from db");
    res.json(connection);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

router.post("/deleteConnection", async (req, res) => {
  try {
    const tableInfo = await Connection.findOne({
      type: req.body.type,
      host: req.body.host,
    });
    let dataSets = JSON.parse(tableInfo.tables);
    let updateDatasets = dataSets.map((dataSet) => {
      const collections = dataSet.collections.filter(
        (collection) =>
          collection.collectionName !== req.body.dataset.collectionName
      );
      dataSet.collections = collections;
      return dataSet;
    });
    updateDatasets = updateDatasets.filter(
      (dataSet) => dataSet.collections.length > 0
    );
    const connection = await Connection.findOneAndUpdate(
      { type: req.body.type, host: req.body.host },
      { tables: JSON.stringify(updateDatasets) },
      { new: true }
    );
    console.log("deleted connection:", updateDatasets);
    res.json(connection);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

router.post("/getData", async (req, res) => {
  //find data that has status as connected from mongodb
  const connection = await Connection.findOne({
    host: req.body.host,
  });
  let collectionData = [];
  let client = null;
  console.log("connection:", connection);
  try {
    switch (connection.type) {
      case "MongoDB":
      case "QuickBooks":
      case "SAP":
      case "Tulip":
      case "MasterControl":
      case "FedEx":
      case "ADP":
        if (connection.uri) {
          client = new MongoClient(connection.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          });
        } else {
          client = new MongoClient(
            `mongodb+srv://${connection.username}:${connection.password}@${connection.host}`,
            {
              useNewUrlParser: true,
              useUnifiedTopology: true,
            }
          );
        }
        await client.connect();
        const db = client.db(req.body.db_name);
        const collection = db.collection(req.body.name);

        // Get all collectionData in the current collection
        collectionData = await collection.find().toArray();
        client.close();
        res.json(collectionData);
      case "postgre":
        client = new Client({
          user: connection.username,
          host: connection.host,
          database: req.body.db_name,
          password: connection.password,
          port: parseInt(connection.port),
        });

        // Connect to the PostgreSQL database
        client
          .connect()
          .then(() => {
            // console.log("Connected to the PostgreSQL database");

            // Query the specific table in the database
            const query = `SELECT * FROM public."${req.body.name}"`;
            return client.query(query);
          })
          .then((result) => {
            // Retrieve the data from the query result
            const data = result.rows;
            // console.log("Retrieved data:", data);

            // Perform any further operations with the data

            // Disconnect from the PostgreSQL database
            client.end();
            res.json(data);
          })
          .catch((error) => {
            console.error(
              "Error connecting to the PostgreSQL database:",
              error
            );
          });
      case "mssql":
        client = await mssql.connect({
          user: connection.username,
          password: connection.password,
          server: connection.host,
          database: req.body.db_name,
          port: parseInt(connection.port),
        });
        try {
          // Get all collectionData in the current collection
          collectionData = await pool
            .request()
            .query(`SELECT * FROM ${req.body.name}`);
          res.json(collectionData.recordset);
        } finally {
          client.close();
        }
    }
  } catch (err) {
    console.log("error catch", err);
  }
});

router.post("/saveData", async (req, res) => {
  try {
    switch (req.body.db) {
      case "MongoDB":
        //find data that has status as connected and type is mongodb
        const connection = await Connection.findOne({
          status: "connected",
          type: "MongoDB",
        });
        if (!connection) {
          res.status(500).json({ message: "No connection found." });
        }
        let client;
        if (connection.uri) {
          client = new MongoClient(connection.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          });
        } else {
          client = new MongoClient(
            `mongodb+srv://${connection.username}:${connection.password}@${connection.host}/${connection.databaseName}`,
            {
              useNewUrlParser: true,
              useUnifiedTopology: true,
            }
          );
        }
        await client.connect();
        const db = client.db("GenAI");
        const collection = db.collection("GenAI");
        console.log("connection:", connection);
        // Ensure that _id is converted to ObjectId
        const documentId = new ObjectId(req.body.data._id);
        // Define the update operation, excluding _id from the update
        const updateData = { ...req.body.data };
        delete updateData._id;
        const update = { $set: updateData };
        const result = await collection.updateOne({ _id: documentId }, update);
        client.close();
        console.log("1 document updated:", result);
        res.json(result);
    }
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

router.post("/deleteData", async (req, res) => {
  try {
    switch (req.body.db) {
      case "MongoDB":
        //find data that has status as connected and type is mongodb
        const connection = await Connection.findOne({
          status: "connected",
          type: "MongoDB",
        });
        if (!connection) {
          res.status(500).json({ message: "No connection found." });
        }
        let client;
        if (connection.uri) {
          client = new MongoClient(connection.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          });
        } else {
          client = new MongoClient(
            `mongodb+srv://${connection.username}:${connection.password}@${connection.host}/${connection.databaseName}`,
            {
              useNewUrlParser: true,
              useUnifiedTopology: true,
            }
          );
        }
        await client.connect();
        const db = client.db("GenAI");
        const collection = db.collection("GenAI");
        console.log("connection:", connection);
        // Ensure that _id is converted to ObjectId
        const documentId = new ObjectId(req.body.data._id);
        const result = await collection.deleteOne({ _id: documentId });
        client.close();
        console.log("1 document deleted:", result);
        res.json(result);
    }
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

router.get("/getDatabaseList", async (req, res) => {
  try {
    //find data that has status as connected from mongodb
    const connections = await Connection.find();
    let data = [];
    let mongodb_databases,
      mongodb_collectionsPerDatabase = [],
      postgres_databases,
      postgres_collectionsPerDatabase = [],
      mssql_databases,
      mssql_collectionsPerDatabase;
    let jsonData = [];
    let index = 0;

    //loop through connections
    for (let i = 0; i < connections.length; i++) {
      // connections.forEach(async connection => {
      const connection = connections[i];
      let client;
      switch (connection.type) {
        case "MongoDB":
        case "QuickBooks":
        case "SAP":
        case "Tulip":
        case "MasterControl":
        case "FedEx":
        case "ADP":
          if (JSON.parse(connection.tables).length === 0) break;
          index++;
          jsonData.push({
            ID: index,
            name: connection.type,
            expanded: true,
          });
          JSON.parse(connection.tables).forEach((table, i) => {
            jsonData.push({
              ID: `${index}_${i + 1}`,
              categoryId: index,
              name: table.name,
            });
            table.collections.forEach((collection, j) => {
              if (collection.status)
                jsonData.push({
                  ID: `${index}_${i + 1}_${j + 1}`,
                  categoryId: `${index}_${i + 1}`,
                  name: collection.collectionName,
                  leaf: true,
                  db_type: connection.type,
                  db_name: table.name,
                  host: connection.host,
                });
            });
          });
          break;
        case "PostgreSQL":
          if (JSON.parse(connection.tables).length === 0) break;

          index++;

          jsonData.push({
            ID: index,
            name: "PostgreSQL",
            expanded: true,
          });
          JSON.parse(connection.tables).forEach((table, i) => {
            jsonData.push({
              ID: `${index}_${i + 1}`,
              categoryId: index,
              name: table.name,
            });
            table.collections.forEach((collection, j) => {
              if (collection.status)
                jsonData.push({
                  ID: `${index}_${i + 1}_${j + 1}`,
                  categoryId: `${index}_${i + 1}`,
                  name: collection.collectionName,
                  leaf: true,
                  db_type: "PostgreSQL",
                  db_name: table.name,
                });
            });
          });
          break;
        case "mssql":
          if (JSON.parse(connection.tables).length === 0) break;

          index++;

          jsonData.push({
            ID: index,
            name: "MSSQL",
            expanded: true,
          });
          JSON.parse(connection.tables).forEach((table, i) => {
            jsonData.push({
              ID: `${index}_${i + 1}`,
              categoryId: index,
              name: table.name,
            });
            table.collections.forEach((collection, j) => {
              if (collection.status)
                jsonData.push({
                  ID: `${index}_${i + 1}_${j + 1}`,
                  categoryId: `${index}_${i + 1}`,
                  name: collection.collectionName,
                  leaf: true,
                  db_type: "mssql",
                  db_name: table.name,
                });
            });
          });
          break;
      }
    }

    console.log("jsonData:", jsonData);
    res.json(jsonData);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

async function getTablesFromPostgresDatabase(databaseName, connection) {
  const client = new Client({
    user: connection.username,
    host: connection.host,
    database: databaseName,
    password: connection.password,
    port: parseInt(connection.port),
  });
  await client.connect();

  const tableQuery = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
  const tableResult = await client.query(tableQuery);
  const tables = tableResult.rows
    .map((row) => row.table_name)
    .filter((name) => !name.includes("temp_"));

  await client.end();

  return tables;
}

module.exports = router;
