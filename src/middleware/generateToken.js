const jwt = require('jsonwebtoken');
const client = require('../connection');

const generateToken = (user_uid) => {
    const token = jwt.sign({ id: user_uid }, process.env.JWT_SECRET, { expiresIn: '10s' });

    client.query(`INSERT INTO tokens (token_uid, token, user_uid) VALUES (uuid_generate_v4(), '${token}', '${user_uid}')`, (err, result) => {
        if (err) {
            console.log(err);
        }
    });
    client.end;

    return token;
}

module.exports = generateToken;