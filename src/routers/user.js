const express = require("express");
const router = new express.Router();
const client = require("../connection");
const bcrypt = require("bcryptjs");
const generateToken = require("../middleware/generateToken");
const auth = require("../middleware/auth");
const multer = require("multer");
const sharp = require("sharp");

router.post("/users", async (req, res) => {
    const user = req.body;
    const hashedPassword = await bcrypt.hash(user.password, 8);
    const values = `uuid_generate_v4(), '${user.name}', '${user.email}', '${hashedPassword}', ''`;

    try {
        await client.query(`INSERT INTO users (user_uid, name, email, password, contributor_email) VALUES (${values})`);
        const result = await client.query(`SELECT * FROM users WHERE email = '${user.email}'`);
        const user_uid = result.rows[0].user_uid;
        user.password = hashedPassword;

        const token = await generateToken(user_uid, req.body.expirationTime);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });

        res.status(201).send({ user, token });
    } catch {
        res.status(400).send();
    }
});

router.post("/users/login", async (req, res) => {
    try {
        const result = await client.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);

        if (!result.rows[0]) {
            throw new Error();
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isMatch) {
            throw new Error();
        }

        const token = await generateToken(user.user_uid, req.body.expirationTime);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });

        res.status(200).send({ user, token });
    } catch {
        res.status(400).send();
    }
});

const upload = multer({
    limits: {
        fileSize: 1000000,
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error("Please upload an image"));
        }
        cb(undefined, true);
    },
});

router.post("/users/me/avatar", auth, upload.single("avatar"), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 100, height: 100 }).png().toBuffer();
    const dataObject = buffer.toJSON();
    const dataJSON = JSON.stringify(dataObject);

    const user = req.user;
    const values = `uuid_generate_v4(), '${user.user_uid}', '${dataJSON}'::json`;

    try {
        const result = await client.query(`INSERT INTO avatars (avatar_uid, user_uid, buffer) VALUES (${values}) 
                                           ON CONFLICT (user_uid) DO UPDATE SET buffer = EXCLUDED.buffer RETURNING *`);
        
        res.status(201).send(result);
    } catch {
        res.status(400).send();
    }
    },
    (error, req, res, next) => {
        res.status(400).send({ error: error.message });
    }
);

router.post("/users/logout", auth, async (req, res) => {
    res.clearCookie("token").status(200).send();
});

router.get("/users/me", auth, (req, res) => {
    res.status(200).send(req.user);
});

router.get("/users/me/avatar", auth, async (req, res) => {
    try {
        const result = await client.query(`SELECT buffer FROM avatars WHERE user_uid = '${req.user.user_uid}'`);
        res.set("Content-Type", "image/png");
        const buffer = Buffer.from(JSON.stringify(result.rows[0]));
        res.status(200).send(buffer);
    } catch {
        res.status(404).send();
    }
});

router.patch("/users/me", auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ["name", "email", "password"];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: "Invalid updates!" });
    }

    try {
        const result = await client.query(`SELECT * FROM users WHERE user_uid = '${req.user.user_uid}'`);
        let user = result.rows[0];

        if (updates.includes("password")) {
            req.body.password = await bcrypt.hash(user.password, 8);
        }

        updates.forEach((update) => (user[update] = req.body[update]));
        let values = "";

        for (let i = 0; i < updates.length; i++) {
            values = values.concat(`${updates[i]} = '${req.body[updates[i]]}', `);
        }
        values = values.substring(0, values.length - 2);

        await client.query(`UPDATE users SET ${values} WHERE user_uid = '${req.user.user_uid}'`);

        res.status(200).send(user);
    } catch {
        res.status(400).send();
    }
});

router.get("/users/me/contributor", auth, async (req, res) => {
    const contributor_email = req.user.contributor_email;

    try {
        const result = await client.query(`SELECT * FROM users WHERE email = '${contributor_email}'`);
        const contributor = result.rows[0];

        res.status(200).send({
            user_uid: contributor.user_uid,
            name: contributor.name,
            email: contributor.email,
        });
    } catch {
        res.status(404).send();
    }
});

router.patch("/users/me/contributor", auth, async (req, res) => {
    const user_email = req.user.email;
    const contributor_email = req.body.contributor_email;

    try {
        const result = await client.query(`SELECT * FROM users WHERE email = '${contributor_email}'`);

        if (result.rows[0].contributor_email) {
            return res.status(400).send({ error: "This user already have a contributor" });
        }
    } catch {
        return res.status(404).send({ error: "This user doesn't exist" });
    }

    try {
        await client.query(`UPDATE users SET contributor_email = '${user_email}' WHERE email = '${contributor_email}'`);
        await client.query(`UPDATE users SET contributor_email = '${contributor_email}' WHERE email = '${user_email}'`);

        res.status(200).send();
    } catch {
        res.status(400).send();
    }
});

router.delete("/users/me/contributor", auth, async (req, res) => {
    const user_email = req.user.email;

    try {
        const result = await client.query(`SELECT contributor_email FROM users WHERE email = '${user_email}'`);
        const contributor_email = result.rows[0].contributor_email;

        await client.query(`UPDATE users SET contributor_email = '' WHERE email IN ('${user_email}', '${contributor_email}')`);

        res.status(200).send();
    } catch {
        res.status(400).send();
    }
});

router.delete("/users/me/avatar", auth, async (req, res) => {
    const user = req.user;

    try {
        await client.query(`DELETE FROM avatars WHERE user_uid = '${user.user_uid}'`);

        res.status(200).send();
    } catch {
        res.status(400).send();
    }
});

router.delete("/users/me", auth, async (req, res) => {
    const user = req.user;
    let hasContributor;
    let contributorUid;

    try {
        const result = await client.query(`SELECT * FROM users WHERE email = '${user.contributor_email}'`);
        contributorUid = result.rows[0].user_uid;
        hasContributor = true;
    } catch {
        hasContributor = false;
    }

    if (hasContributor) {
        try {
            await client.query(`UPDATE users SET contributor_email = '' WHERE user_uid = '${contributorUid}'`);
        } catch {
            return res.status(400).send();
        }
    }

    try {
        await client.query(`DELETE FROM users WHERE user_uid = '${user.user_uid}'`);
        res.status(200).clearCookie("token").send(user);
    } catch {
        res.status(500).send();
    }
});

module.exports = router;