const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database/database');
const connectDB = require('./config/db');
const cors = require('cors');

console.log('environment    ', process.env.ENVIRONMENT)
console.log('PORT    ', process.env.PORT)
console.log('MONGO_CONNECTION_STRING    ', process.env.MONGO_CONNECTION_STRING)
if(process.env.ENVIRONMENT !== 'production') {
    require('dotenv').config()
}

connectDB();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    next();
})


app.use('/api', require('./routes/api/connect'));
app.use('/chatgpt', require('./routes/api/openAI'));

app.listen(port, () => {
    console.log(`Server listening on the port  ${port}`);
})