const client = require('./connection');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const userRouter = require('./routers/user');
const taskRouter = require('./routers/task');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: 'http://localhost:3000'
}));
app.use(userRouter);
app.use(taskRouter);

client.connect();

app.listen(3001, () => console.log('Server is up on port 3001.'));