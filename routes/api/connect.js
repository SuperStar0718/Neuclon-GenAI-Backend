const express = require("express");
const config = require("config");
const db = require("../../database/database");
const { MongoClient, ObjectId } = require("mongodb");
const { Client } = require("pg");
const mongoose = require("mongoose");

const Connection = require("../../models/Connection");

const router = express.Router();

// @route  POST api/users
// @desc   Register user
// @access Public
router.post("/connect", async (req, res) => {
    try {
        const connection = await db.connectToDatabase(req.body);

        console.log("connection:", connection);
        await Connection.findOneAndReplace(
            { type: connection.type },
            connection,
            {
                upsert: true,
            }
        );
        // Connection.updateOne({type: 'mongodb'}, {dburi:'asdf'})
        // Connection.create(connection)
        res.json(connection);
    } catch (err) {
        console.log("error catch", err);
        res.status(500).json({ message: "Whoops, something went wrong." });
    }
});

router.get("/getAllConnections", async (req, res) => {
    const connections = await Connection.find();
    res.json(connections);
});

router.post("/stopConnection", async (req, res) => {
    try {
        req.body.status = "disconnected";
        const connection = await Connection.findOneAndUpdate(
            { type: req.body.type },
            { status: "disconnected" },
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
        const connection = await Connection.findOneAndDelete({
            type: req.body.type,
        });
        console.log("deleted connection");
        res.json(connection);
    } catch (err) {
        console.log("error catch", err);
        res.status(500).json({ message: "Whoops, something went wrong." });
    }
});

router.post("/getData", async (req, res) => {
    //find data that has status as connected from mongodb
    const connection = await Connection.findOne({
        status: "connected",
        type: req.body.db_type,
    });
    let collectionData = [];

    let client;
    if (connection.type === "mongodb") {
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
        res.json(collectionData);
    } else if (connection.type === "postgre") {
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
    } else if (connection.type === "mssql") {
        const client = await mssql.connect({
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
});

router.post("/saveData", async (req, res) => {
    try {
        switch (req.body.db) {
            case "mongodb":
                //find data that has status as connected and type is mongodb
                const connection = await Connection.findOne({
                    status: "connected",
                    type: "mongodb",
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
                const result = await collection.updateOne(
                    { _id: documentId },
                    update
                );

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
            case "mongodb":
                //find data that has status as connected and type is mongodb
                const connection = await Connection.findOne({
                    status: "connected",
                    type: "mongodb",
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

                console.log("1 document deleted:", result);
                res.json(result);
        }
    } catch (err) {
        console.log("error catch", err);
        res.status(500).json({ message: "Whoops, something went wrong." });
    }
});

router.get("/getDatabaseList", async (req, res) => {
    try{

        //find data that has status as connected from mongodb
        const connections = await Connection.find({ status: "connected" });
        let data = [];
        let mongodb_databases,
            mongodb_collectionsPerDatabase,
            postgres_databases,
            postgres_collectionsPerDatabase,
            mssql_databases,
            mssql_collectionsPerDatabase;
        //loop through connections
        for (let i = 0; i < connections.length; i++) {
            // connections.forEach(async connection => {
            const connection = connections[i];
            let client;
            switch (connection.type) {
                case "mongodb":
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

                    // Get all database names
                    const databaseNames = await client.db().admin().listDatabases();
                    mongodb_databases = databaseNames.databases.map(
                        (db) => db.name
                    ).filter((name)=> name !=="admin" && name !== "local");

                    // Get all collections per database
                    mongodb_collectionsPerDatabase = {};
                    for (const database of mongodb_databases) {
                        const collectionNames = await client
                            .db(database)
                            .listCollections()
                            .toArray();
                        const collections = collectionNames.map(
                            (collection) => collection.name
                        );
                        mongodb_collectionsPerDatabase[database] = collections;
                    }

                    break;
                case "postgre":
                    client = new Client({
                        user: connection.username,
                        host: connection.host,
                        password: connection.password,
                        port: parseInt(connection.port),
                        database: "",
                    });
                    await client.connect();

                    // Get all database names
                    const databaseQuery =
                        "SELECT datname FROM pg_database WHERE datistemplate = false;";
                    const databaseResult = await client.query(databaseQuery);
                    postgres_databases = databaseResult.rows.map(
                        (row) => row.datname
                    ).filter((name)=> name !=="readme_to_recover");

                    // Get all table names per database
                    postgres_collectionsPerDatabase = {};
                    for (const database of postgres_databases) {
                        const tables = await getTablesFromPostgresDatabase(
                            database,
                            connection
                        );
                        postgres_collectionsPerDatabase[database] = tables;
                    }
                    await client.end();
                    break;
                case "mssql":
                    client = await mssql.connect({
                        user: connection.username,
                        password: connection.password,
                        server: connection.host,
                        database: connection.databaseName,
                        port: parseInt(connection.port),
                    });
                    try {
                        // Get all database names
                        const databaseQuery =
                            "SELECT name FROM sys.databases WHERE database_id > 4;";
                        const databaseResult = await pool
                            .request()
                            .query(databaseQuery);
                        mssql_databases = databaseResult.recordset.map(
                            (row) => row.name
                        );

                        // Get all table names per database
                        mssql_collectionsPerDatabase = {};
                        for (const database of mssql_databases) {
                            const tableQuery = `SELECT name FROM ${database}.sys.tables;`;
                            const tableResult = await pool
                                .request()
                                .query(tableQuery);
                            const tables = tableResult.recordset.map(
                                (row) => row.name
                            );
                            mssql_collectionsPerDatabase[database] = tables;
                        }
                    } finally {
                        client.close();
                    }
                    break;
            }
        }

        let jsonData = [];
        let index = 0;
        if (mongodb_databases) {
            index++;
            jsonData.push({
                ID: index,
                name: "MongoDB",
                expanded: true,
            });
            for (let i = 0; i < mongodb_databases.length; i++) {
                jsonData.push({
                    ID: `${index}_${i + 1}`,
                    categoryId: index,
                    name: mongodb_databases[i],
                });
                for (
                    let j = 0;
                    j < mongodb_collectionsPerDatabase[mongodb_databases[i]].length;
                    j++
                ) {
                    jsonData.push({
                        ID: `${index}_${i + 1}_${j + 1}`,
                        categoryId: `${index}_${i + 1}`,
                        name: mongodb_collectionsPerDatabase[mongodb_databases[i]][
                            j
                        ],
                        leaf: true,
                        db_type: "mongodb",
                        db_name: mongodb_databases[i],
                    });
                }
            }
        }

        if (postgres_databases) {
            index++;
            jsonData.push({
                ID: index,
                name: "PostgreSQL",
            });
            for (let i = 0; i < postgres_databases.length; i++) {
                jsonData.push({
                    ID: `${index}_${i + 1}`,
                    categoryId: index,
                    name: postgres_databases[i],
                });
                for (
                    let j = 0;
                    j <
                    postgres_collectionsPerDatabase[postgres_databases[i]].length;
                    j++
                ) {
                    jsonData.push({
                        ID: `${index}_${i + 1}_${j + 1}`,
                        categoryId: `${index}_${i + 1}`,
                        name: postgres_collectionsPerDatabase[
                            postgres_databases[i]
                        ][j],
                        leaf: true,
                        db_type: "postgre",
                        db_name: postgres_databases[i],
                    });
                }
            }
        }
        if (mssql_databases) {
            index++;
            jsonData.push({
                ID: index,
                name: "MSSQL",
            });
            for (let i = 0; i < mssql_databases.length; i++) {
                jsonData.push({
                    ID: `${index}_${i + 1}`,
                    categoryId: index,
                    name: mssql_databases[i],
                });

                for (
                    let j = 0;
                    j < mssql_collectionsPerDatabase[mssql_databases[i]].length;
                    j++
                ) {
                    jsonData.push({
                        ID: `${index}_${i + 1}_${j + 1}`,
                        categoryId: `${index}_${i + 1}`,
                        name: mssql_collectionsPerDatabase[mssql_databases[i]][j],
                        leaf: true,
                        db_type: "mssql",
                        db_name: mssql_databases[i],
                    });
                }
            }
        }

        res.json(jsonData);
    }
    catch (err) {
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
    const tables = tableResult.rows.map((row) => row.table_name).filter((name)=> !name.includes("temp_"));

    await client.end();

    return tables;
}

module.exports = router;
