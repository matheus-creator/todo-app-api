require("dotenv").config();
const client = require('./connection');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const userRouter = require('./routers/user');
const taskRouter = require('./routers/task');

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
}));
app.use(userRouter);
app.use(taskRouter);

client.connect();

app.listen(port, () => console.log(`Server is up on port ${port}.`));