const express = require('express');
const config = require('config');
const db = require('../../database/database');

const Connection = require('../../models/Connection');

const router = express.Router();

// @route  POST api/users
// @desc   Register user
// @access Public
router.post('/connect', async (req, res) => {
    try{
        const connection = await db.connectToDatabase(req.body);

        console.log('connection:',connection)
        await Connection.findOneAndReplace({type: connection.type}, connection, {upsert: true})
        // Connection.updateOne({type: 'mongodb'}, {dburi:'asdf'})
        // Connection.create(connection)
        res.json( connection)
    } catch(err) {
        console.log('error catch', err)
        res.status(500).json({message: 'Whoops, something went wrong.'})
    }
});

router.get('/getAllConnections', async (req, res) => {
        const connections = await Connection.find();
        res.json(connections);
});

router.post('/stopConnection', async (req, res) => {
    try{
        req.body.status = 'disconnected';
        const connection = await Connection.findOneAndUpdate({type: req.body.type}, {status: 'disconnected'}, {new: true})
        console.log('req.body', connection)
        // const connection = await Connection.findOneAndReplace({type: req.body.type}, req.body, {upsert: true})
        console.log('disconnected from db')
        res.json( connection)
    }
    catch(err) {
        console.log('error catch', err)
        res.status(500).json({message: 'Whoops, something went wrong.'})
    }
});

router.post('/deleteConnection', async (req, res) => {
    try{
        const connection = await Connection.findOneAndDelete({type: req.body.type});
        console.log('deleted connection')
        res.json( connection)
    }
    catch(err) {
        console.log('error catch', err)
        res.status(500).json({message: 'Whoops, something went wrong.'})
    }
});

module.exports = router;
