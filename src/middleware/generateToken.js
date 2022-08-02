const jwt = require('jsonwebtoken');
const client = require('../connection');

const generateToken = (user) => {
    const token = jwt.sign({ id: user.user_uid }, 'todo-app-auth');

    client.query(`INSERT INTO tokens (token_uid, token) VALUES (uuid_generate_v4(), '${token}')`);
    client.end;

    return token;
}

module.exports = generateToken;