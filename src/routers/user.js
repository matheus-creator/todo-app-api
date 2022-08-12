const express = require('express');
const router = new express.Router();
const client = require('../connection');
const bcrypt = require('bcryptjs');
const generateToken = require('../middleware/generateToken');
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');

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

        res.cookie('token', token, {
            httpOnly: true,
            //secure: true,
        });
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
        res.cookie('token', token, {
            httpOnly: true,
            //secure: true,
        });
        res.status(200).send({ user, token });
    });
    client.end;
});

const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an image'));
        }
        cb(undefined, true);
    }
});

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 100, height: 100 }).png().toBuffer();
    const dataObject = buffer.toJSON();
    const dataJSON = JSON.stringify(dataObject);
    
    const user = req.user;

    const values = `uuid_generate_v4(), '${user.user_uid}', '${dataJSON}'::json`;
    
    await client.query(`INSERT INTO avatars (avatar_uid, user_uid, buffer) VALUES (${values}) ON CONFLICT (user_uid) DO UPDATE SET buffer = EXCLUDED.buffer`).then((result) => {
        res.status(201).send();
    }).catch(err => {
        res.status(400).send(err);
    });
    
    client.end;
}, (error, req, res, next) => {
    console.log('failed');
    res.status(400).send({ error: error.message });
});

router.post('/users/logout', auth, async (req, res) => {
    res.clearCookie('token').status(200).send();
});

router.get('/users/me', auth, (req, res) => {
    res.status(200).send(req.user);
});

router.get('/users/me/avatar', auth, async (req, res) => {
    await client.query(`SELECT buffer FROM avatars WHERE user_uid = '${req.user.user_uid}'`).then((result) => {
        res.set('Content-Type', 'image/png');
        const buffer = Buffer.from(JSON.stringify(result.rows[0]));
        res.status(200).send(buffer);
    }).catch(err => {
        res.status(404).send(err);
    });
});

router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    let user;
    let values = '';

    await client.query(`SELECT * FROM users WHERE user_uid = '${req.user.user_uid}'`).then(result => {
        user = result.rows[0];
    }).catch(err => {
        return res.status(404).send();
    });

    if (updates.includes('password')) {
        req.body.password = await bcrypt.hash(user.password, 8);
    }

    updates.forEach(update => user[update] = req.body[update]);

    for (let i = 0; i < updates.length; i++) {
        values = values.concat(`${updates[i]} = '${req.body[updates[i]]}', `);
    }
    values = values.substring(0, values.length - 2);

    await client.query(`UPDATE users SET ${values} WHERE user_uid = '${req.user.user_uid}'`).then(result => {
        res.status(200).send(user);
    }).catch(err => {
        res.status(400).send(err);
    });
    
    client.end;
});

router.delete('/users/me', auth, async (req, res) => {
    const user = req.user;

    await client.query(`DELETE FROM users WHERE user_uid = '${user.user_uid}'`).then(result => {
        res.status(200).clearCookie('token').send(user);
    }).catch(err => {
        res.status(500).send(err);
    });

    client.end;
});

module.exports = router;