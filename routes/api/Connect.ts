import { Router } from "express";
import {
  connectTables,
  connectToDatabase,
  establishConnection,
  getAllConnections,
} from "../../repogitories/ConnectionRepo";
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
/*
 * @route  POST connect
 * @desc   check validation for database connnection info and get all tables and store in database
 * @access Public
 */
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

/*
 * @route  POST connectTables
 * @desc   add or update table of connection
 * @access Public
 */
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

/*
 * @route  GET getAllConnections
 * @desc   get all connections
 * @access Public
 */
Connect.get("/getAllConnections", async (req, res) => {
  try {
    const connections = await getAllConnections();
    res.json(connections);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});
/*
 * @route  POST refreshConnection
 * @desc   refresh connection
 * @access Public
 */
Connect.post("/refreshConnection", async (req, res) => {
  try {
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
/*
 * @route  POST stopConnection
 * @desc   stop connection
 * @access Public
 */
Connect.post("/stopConnection", async (req, res) => {
  try {
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
/*
 * @route  POST deleteConnection
 * @desc   delete connection
 * @access Public
 */
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
/*
 * @route  POST getData
 * @desc   get data from database
 * @access Public
 */
Connect.post("/getData", async (req, res) => {
  try {
    await getData(req, res);
  } catch (err) {
    console.log("error catch", err);
  }
});
/*
 * @route  POST getJoinedTableData
 * @desc   get joined table data
 * @access Public
 */
Connect.post("/getJoinedTableData", async (req, res) => {
  try {
    const joinedData = await getJoinedTableData(req);
    res.json(joinedData);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});
/*
 * @route  POST deleteModel
 * @desc   delete model
 * @access Public
 */
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
/*
 * @route  POST saveModel
 * @desc   save model
 * @access Public
 */
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
/*
 * @route  GET getModels
 * @desc   get all models
 * @access Public
 */
Connect.get("/getModels", async (req, res) => {
  try {
    const response = await getModels();
    res.json(response);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});
/*
 * @route  GET getModel
 * @desc   get model by id
 * @access Public
 */
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
/*
 * @route  POST saveData
 * @desc   save data
 * @access Public
 */
Connect.post("/saveData", async (req, res) => {
  try {
    await saveData(req, res);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});
/*
 * @route  POST deleteData
 * @desc   delete data
 * @access Public
 */
Connect.post("/deleteData", async (req, res) => {
  try {
    await deleteData(req, res);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});
/*
 * @route  GET getDatabaseList
 * @desc   get database list
 * @access Public
 */
Connect.get("/getDatabaseList", async (req, res) => {
  try {
    const jsonData = await getDatabaseList();
    res.json(jsonData);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

export default Connect;
