const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database/database');
const connectDB = require('./config/db');

console.log('environment    ', process.env.ENVIRONMENT)
console.log('PORT    ', process.env.PORT)
console.log('MONGO_CONNECTION_STRING    ', process.env.MONGO_CONNECTION_STRING)
if(process.env.ENVIRONMENT !== 'production') {
    require('dotenv').config()
}

connectDB();


const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, './client/build')));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    next();
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './client/build/index.html'));
});

// app.post('/api/connect', async(req, res) => {
//     console.log('req.body', req.body)
//     try{
//         const connection = await db.connectToDatabase(req.body);
//         res.json( connection)
//     } catch(err) {
//         console.log('error', err)
//         res.status(500).json({message: 'Whoops, something went wrong.'})
//     }
// })

app.use('/api', require('./routes/api/connect'));
app.use('/chatgpt', require('./routes/api/openAI'));





app.listen(port, () => {
    console.log(`Server listening on the port  ${port}`);
})