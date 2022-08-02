const jwt = require('jsonwebtoken');
const client = require('../connection');

const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, 'todo-app-auth');

        client.query(`SELECT * FROM tokens WHERE token = ${token}`, (err, result) => {
            if (err) {
                throw new Error();
            }

            req.token = token;
            req.user = result.rows;
            next();
        });
    } catch {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

module.exports = auth;