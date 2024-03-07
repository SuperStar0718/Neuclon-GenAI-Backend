import { MongoClient, ObjectId } from "mongodb";
import Connection from "../models/Connection";
import { ICollection, ITable } from "../types";
import { Request, Response } from "express";
import { Client } from "pg";
import sql from "mssql";

export /**
 *
 *
 * @param {string} type
 * @param {string} host
 * @param {string} collectionName
 * @return {*}
 */
const refreshConnection = async (
  type: string,
  host: string,
  collectionName: string
) => {
  const tableInfo = await Connection.findOne({
    type: type,
    host: host,
  });
  let dataSets = [];
  if (tableInfo) {
    dataSets = JSON.parse(tableInfo.tables);
  }
  dataSets.forEach(async (dataSet: ITable) => {
    dataSet.collections.forEach(async (collection) => {
      if (collection.collectionName === collectionName)
        collection.status = true;
    });
  });

  const connection = await Connection.findOneAndUpdate(
    { type: type, host: host },
    { tables: JSON.stringify(dataSets) },
    { new: true }
  );

  return connection;
};

export /**
 *
 *
 * @param {string} type
 * @param {string} host
 * @param {string} collectionName
 * @return {*}
 */
const stopConnection = async (
  type: string,
  host: string,
  collectionName: string
) => {
  const tableInfo = await Connection.findOne({
    type: type,
    host: host,
  });
  let dataSets = [];
  if (tableInfo) {
    dataSets = JSON.parse(tableInfo.tables);
  }
  dataSets.forEach(async (dataSet: ITable) => {
    dataSet.collections.forEach(async (collection: ICollection) => {
      if (collection.collectionName === collectionName)
        collection.status = false;
    });
  });
  const connection = await Connection.findOneAndUpdate(
    { type: type, host: host },
    { tables: JSON.stringify(dataSets) },
    { new: true }
  );
  return connection;
};

export /**
 *
 *
 * @param {string} type
 * @param {string} host
 * @param {string} collectionName
 * @return {*}
 */
const deleteConnection = async (
  type: string,
  host: string,
  collectionName: string
) => {
  const tableInfo = await Connection.findOne({
    type: type,
    host: host,
  });
  let dataSets = [];
  if (tableInfo) dataSets = JSON.parse(tableInfo.tables);
  let updateDatasets = dataSets.map((dataSet: ITable) => {
    const collections = dataSet.collections.filter(
      (collection) => collection.collectionName !== collectionName
    );
    dataSet.collections = collections;
    return dataSet;
  });
  updateDatasets = updateDatasets.filter(
    (dataSet: ITable) => dataSet.collections.length > 0
  );
  const connection = await Connection.findOneAndUpdate(
    { type: type, host: host },
    { tables: JSON.stringify(updateDatasets) },
    { new: true }
  );
  return connection;
};

export /**
 *
 *
 * @param {Request} req
 * @param {Response} res
 */
const getData = async (req: Request, res: Response) => {
  //find data that has status as connected from mongodb
  const connection = await Connection.findOne({
    host: req.body.host,
  });
  let collectionData = [];
  let client: any = null;
  switch (connection?.type) {
    case "MongoDB":
    case "QuickBooks":
    case "SAP":
    case "Tulip":
    case "MasterControl":
    case "FedEx":
    case "ADP":
      if (connection.uri) {
        client = new MongoClient(connection.uri, {});
      } else {
        client = new MongoClient(
          `mongodb+srv://${connection.username}:${connection.password}@${connection.host}`,
          {}
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

          // Query the specific table in the database
          const query = `SELECT * FROM public."${req.body.name}"`;
          return client.query(query);
        })
        .then((result: any) => {
          // Retrieve the data from the query result
          const data = result.rows;
          // Disconnect from the PostgreSQL database
          client.end();
          res.json(data);
        })
        .catch((error: any) => {
          console.error("Error connecting to the PostgreSQL database:", error);
        });
    case "mssql":
      client = await sql.connect({
        user: connection.username,
        password: connection.password,
        server: connection.host,
        database: req.body.db_name,
        port: parseInt(connection.port),
      });
      try {
        // Get all collectionData in the current collection
        let tableName = req.body.name;
        let query = `SELECT * FROM @table`;
        let request = new sql.Request();
        request.input("table", sql.NVarChar, tableName);
        let collectionData = await request.query(query);
        res.json(collectionData.recordset);
      } finally {
        client.close();
      }
  }
};

export /**
 *
 *
 * @param {Request} req
 * @return {*}
 */
const getJoinedTableData = async (req: Request) => {
  const connectedNodes = req.body;
  let collectionData = [];
  let i: number;
  for (i = 0; i < connectedNodes.length; i++) {
    const node = connectedNodes[i];
    const connection = await Connection.findOne({
      host: node.host,
    });
    let client: any = null;
    try {
      switch (connection?.type) {
        case "MongoDB":
        case "QuickBooks":
        case "SAP":
        case "Tulip":
        case "MasterControl":
        case "FedEx":
        case "ADP":
          if (connection.uri) {
            client = new MongoClient(connection.uri, {});
          } else {
            client = new MongoClient(
              `mongodb+srv://${connection.username}:${connection.password}@${connection.host}`,
              {}
            );
          }
          await client.connect();
          const db = client.db(node.dbname);
          const collection = db.collection(node.description);

          // Get all collectionData in the current collection
          collectionData[i] = await collection
            .find({}, { projection: { _id: 0 } })
            .toArray();
          await client.close();
          break;
        case "postgre":
          client = new Client({
            user: connection.username,
            host: connection.host,
            database: node.dbname,
            password: connection.password,
            port: parseInt(connection.port),
          });

          // Connect to the PostgreSQL database
          client
            .connect()
            .then(() => {
              // Query the specific table in the database
              const query = `SELECT * FROM public."${node.description}"`;
              return client.query(query);
            })
            .then(async (result: any) => {
              // Retrieve the data from the query result
              const data = result.rows;
              // Disconnect from the PostgreSQL database
              client.end();
              collectionData[i] = await collection.find().toArray();
            })
            .catch((error: any) => {
              console.error(
                "Error connecting to the PostgreSQL database:",
                error
              );
            });
          break;
        case "mssql":
          client = await sql.connect({
            user: connection.username,
            password: connection.password,
            server: connection.host,
            database: req.body.db_name,
            port: parseInt(connection.port),
          });
          try {
            // Get all collectionData in the current collection
            let tableName = node.description;
            let query = `SELECT * FROM @table`;
            let request = new sql.Request();
            request.input("table", sql.NVarChar, tableName);
            let collectionData = await request.query(query);
          } finally {
            client.close();
          }
          break;
      }
    } catch (err) {
      console.log("error catch", err);
    }
  }
  // get the keys of collectionData[0]
  const key_headers = Object.keys(collectionData[0][0]);

  for (i = 0; i < key_headers.length; i++) {
    if (key_headers[i] === "_id") continue;
    let j;
    for (j = 0; j < collectionData.length; j++) {
      if (!collectionData[j][0].hasOwnProperty(key_headers[i])) break;
    }
    if (j == collectionData.length) break;
  }
  if (i == key_headers.length) {
    throw new Error("No matching key found");
  }
  const matching_key = key_headers[i];

  let joinedData = [];

  for (i = 0; i < collectionData.length; i++) {
    let j;
    for (j = 0; j < collectionData[i].length; j++) {
      const matching_value = collectionData[i][j][matching_key];

      const matching_index: number = joinedData.findIndex(
        (e) => e[matching_key] === matching_value
      );
      if (matching_index === -1) {
        joinedData.push(collectionData[i][j]);
      } else {
        const old_data: any = joinedData[matching_index];
        joinedData[matching_index] = { ...old_data, ...collectionData[i][j] };
      }
    }
  }
  return joinedData;
};

export /**
 *
 *
 * @param {Request} req
 * @param {Response} res
 */
const saveData = async (req: Request, res: Response) => {
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
      if (connection?.uri) {
        client = new MongoClient(connection.uri, {});
      } else {
        client = new MongoClient(
          `mongodb+srv://${connection?.username}:${connection?.password}@${connection?.host}`,
          {}
        );
      }
      await client.connect();
      const db = client.db("GenAI");
      const collection = db.collection("GenAI");
      // Ensure that _id is converted to ObjectId
      const documentId = new ObjectId(req.body.data._id);
      // Define the update operation, excluding _id from the update
      const updateData = { ...req.body.data };
      delete updateData._id;
      const update = { $set: updateData };
      const result = await collection.updateOne({ _id: documentId }, update);
      client.close();
      res.json(result);
  }
};

export /**
 *
 *
 * @param {Request} req
 * @param {Response} res
 */
const deleteData = async (req: Request, res: Response) => {
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
      if (connection?.uri) {
        client = new MongoClient(connection.uri, {});
      } else {
        client = new MongoClient(
          `mongodb+srv://${connection?.username}:${connection?.password}@${connection?.host}`,
          {}
        );
      }
      await client.connect();
      const db = client.db("GenAI");
      const collection = db.collection("GenAI");
      // Ensure that _id is converted to ObjectId
      const documentId = new ObjectId(req.body.data._id);
      const result = await collection.deleteOne({ _id: documentId });
      client.close();
      res.json(result);
  }
};

export /**
 *
 *
 * @return {*} 
 */
 const getDatabaseList = async () => {
  //find data that has status as connected from mongodb
  const connections = await Connection.find();
  
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
        JSON.parse(connection.tables).forEach((table: ITable, i: number) => {
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
        JSON.parse(connection.tables).forEach((table: ITable, i: number) => {
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
        JSON.parse(connection.tables).forEach((table: ITable, i: number) => {
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
  return jsonData;
};
