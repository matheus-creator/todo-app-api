const jwt = require('jsonwebtoken');
const client = require('../connection');

const generateToken = (user) => {
    const token = jwt.sign({ id: user.user_uid }, 'todo-app-auth');

    client.query(`INSERT INTO tokens (token_uid, token, user_uid) VALUES (uuid_generate_v4(), '${token}', '${user.user_uid}')`, (err, result) => {
        if (err) {
            console.log(err);
        }
    });
    client.end;

    return token;
}

module.exports = generateToken;