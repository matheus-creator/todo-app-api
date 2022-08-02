const express = require('express');
const router = new express.Router();
const client = require('../connection');
const bcrypt = require('bcryptjs');
const generateToken = require('../middleware/generateToken');

router.post('/users', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 8); 
    const values = `uuid_generate_v4(), '${req.body.name}', '${req.body.email}', '${hashedPassword}'`;
    client.query(`INSERT INTO users (user_uid, name, email, password) VALUES (${values})`, (err, result) => {
        if (err) {
            return res.status(400).send(err);
        }        
        res.status(201).send({ name: req.body.name });
    });
    client.end;
});

router.post('/users/login', (req, res) => {
    client.query(`SELECT * FROM users WHERE email = '${req.body.email}'`, async (err, result) => {
        if (err) {
            return res.status(400).send({ error: 'Unable to login.'});
        }
        else if (!result.rows[0]) {
            return res.status(400).send({ error: 'Unable to login.'});
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isMatch) {
            return res.status(400).send({ error: 'Unable to login.'});
        }

        const token = await generateToken(user);
        res.status(200).send({ user, token });
    });
});

router.get('/users', (req, res) => {
    client.query(`SELECT * FROM users`, (err, result) => {
        if (!err) {
            res.send(result.rows[0]);
        }
    });
    client.end;
});

// change when add authentication

router.delete('/users/:id', (req, res) => {
    client.query(`DELETE FROM users WHERE user_uid = '${req.params.id}'`, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).send({ name: req.body.name });
    });
    client.end;
});

module.exports = router;