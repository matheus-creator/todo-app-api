const express = require('express');
const router = new express.Router();
const client = require('../connection');
const bcrypt = require('bcryptjs');
const generateToken = require('../middleware/generateToken');
const auth = require('../middleware/auth');

router.post('/users', async (req, res) => {
    const user = req.body;
    const hashedPassword = await bcrypt.hash(user.password, 8); 
    const values = `uuid_generate_v4(), '${user.name}', '${user.email}', '${hashedPassword}'`;
    
    await client.query(`INSERT INTO users (user_uid, name, email, password) VALUES (${values})`).then( async (result) => {
        let user_uid;
        await client.query(`SELECT * FROM users WHERE email = '${user.email}'`).then(result => {
            user_uid = result.rows[0].user_uid;
            user.password = hashedPassword;
        }).catch(err => {
            throw new Error(err);
        });

        const token = await generateToken(user_uid);

        res.status(201).send({ user, token });
    }).catch(err => {
        res.status(400).send(err);
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

        const token = await generateToken(user.user_uid);
        delete user.user_uid;
        res.status(200).send({ user, token });
    });
});

router.post('/users/logout', auth, async (req, res) => {
    await client.query(`DELETE FROM tokens WHERE token = '${req.token}'`).then(result => {
        res.status(200).send();
    }).catch(err => {
        res.status(500).send();
    });
});

router.post('/users/logoutAll', auth, (req, res) => {
    client.query(`DELETE FROM tokens WHERE user_uid = '${req.user.user_uid}'`, (err, result) => {
        if (err) {
            res.status(500).send(err);
            console.log(err);
        }
        res.status(200).send();
    });
});

router.get('/users', (req, res) => {
    client.query(`SELECT * FROM users`, (err, result) => {
        if (!err) {
            res.send(result.rows);
        }
    });
    client.end;
});

// change when add authentication

router.delete('/users/me', auth, async (req, res) => {
    const user = req.user;

    await client.query(`DELETE FROM tokens WHERE user_uid = '${user.user_uid}'`);
    await client.query(`DELETE FROM tasks WHERE user_uid = '${user.user_uid}'`);
    await client.query(`DELETE FROM users WHERE user_uid = '${user.user_uid}'`).then(result => {
        res.status(200).send(user);
    }).catch(err => {
        res.status(500).send(err);
    });

    client.end;
});

module.exports = router;