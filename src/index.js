const express = require('express');
const client = require('./connection');
const cors = require('cors');
const userRouter = require('./routers/user');
const taskRouter = require('./routers/task');

const app = express();

app.use(express.json());
app.use(cors());
app.use(userRouter);
app.use(taskRouter);

app.listen(3001, () => console.log('Server is up on port 3001.'));

client.connect();