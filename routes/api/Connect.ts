import Connection from "../../models/Connection";
import { Router, Request, Response } from "express";
import sql from "mssql";
import { Client } from "pg";
import { MongoClient, ObjectId } from "mongodb";
import {
  connectTables,
  connectToDatabase,
  establishConnection,
  getAllConnections,
} from "../../repogitories/ConnectionRepo";
import Model from "../../models/Model";
import { ICollection, ITable } from "../../types";
import {
  deleteConnection,
  deleteData,
  getData,
  getDatabaseList,
  getJoinedTableData,
  refreshConnection,
  saveData,
  stopConnection,
} from "../../services/ConnectionService";
import {
  deleteModel,
  getModel,
  getModels,
  saveModel,
} from "../../repogitories/ModelRepo";

const Connect = Router();

// @route  POST api/users
// @desc   Register user
// @access Public
Connect.post("/connect", async (req, res) => {
  try {
    const connection = await connectToDatabase(req.body);
    const response = await establishConnection(connection);
    res.json(response);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/connectTables", async (req, res) => {
  try {
    const connection = req.body;
    await connectTables(connection);
    res.json(connection);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.get("/getAllConnections", async (req, res) => {
  try {
    const connections = await getAllConnections();
    res.json(connections);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/refreshConnection", async (req, res) => {
  try {
    console.log("req.body in refresh", req.body);
    const connection = await refreshConnection(
      req.body.type,
      req.body.host,
      req.body.dataset.collectionName
    );

    res.json(connection);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/stopConnection", async (req, res) => {
  try {
    console.log("req.body", req.body);
    const connection = await stopConnection(
      req.body.type,
      req.body.host,
      req.body.dataset.collectionName
    );

    res.json(connection);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/deleteConnection", async (req, res) => {
  try {
    const connection = await deleteConnection(
      req.body.type,
      req.body.host,
      req.body.dataset.collectionName
    );
    res.json(connection);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/getData", async (req, res) => {
  try {
    await getData(req, res);
  } catch (err) {
    console.log("error catch", err);
  }
});

Connect.post("/getJoinedTableData", async (req, res) => {
  try {
    const joinedData = await getJoinedTableData(req);
    res.json(joinedData);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/deleteModel", async (req, res) => {
  try {
    const id = req.body.id;
    const response = await deleteModel(id);
    res.json(response);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/saveModel", async (req, res) => {
  try {
    const modelData = req.body;
    const response = await saveModel(modelData);
    res.json(response);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.get("/getModels", async (req, res) => {
  try {
    const response = await getModels();
    res.json(response);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.get("/getModel/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const response = await getModel(id);
    res.json(response);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/saveData", async (req, res) => {
  try {
    await saveData(req, res);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.post("/deleteData", async (req, res) => {
  try {
    await deleteData(req, res);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

Connect.get("/getDatabaseList", async (req, res) => {
  try {
    const jsonData = await getDatabaseList();
    console.log("jsonData:", jsonData);
    res.json(jsonData);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

export default Connect;
