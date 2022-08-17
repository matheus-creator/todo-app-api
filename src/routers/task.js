const express = require("express");
const router = new express.Router();
const client = require("../connection");
const auth = require("../middleware/auth");

router.post("/tasks", auth, async (req, res) => {
    const task = req.body;
    const values = `uuid_generate_v4(), '${task.title}', '${task.description}', '${task.completed}', '${req.user.user_uid}'`;

    try {
        const result = await client.query(`INSERT INTO tasks (task_uid, title, description, completed, user_uid) VALUES (${values}) RETURNING *`);

        res.status(201).send(result.rows[0]);
    } catch {
        res.status(400).send();
    }
});

router.post("/contributorTasks", auth, async (req, res) => {
    const task = req.body;

    try {
        const result = await client.query(`SELECT * FROM users WHERE email = '${req.user.contributor_email}'`);

        const contributor_uid = result.rows[0].user_uid;
        const values = `uuid_generate_v4(), '${task.title}', '${task.description}', '${task.completed}', '${contributor_uid}'`;

        const response = await client.query(`INSERT INTO tasks (task_uid, title, description, completed, user_uid) VALUES (${values}) RETURNING *`);

        res.status(201).send(response.rows[0]);
    } catch {
        res.status(400).send();
    }
});

router.get("/tasks", auth, async (req, res) => {
    try {
        const result = await client.query(`SELECT * FROM tasks WHERE user_uid = '${req.user.user_uid}'`);

        res.status(200).send(result.rows);
    } catch {
        res.status(500).send();
    }
});

router.get("/contributorTasks", auth, async (req, res) => {
    try {
        const result = await client.query(`SELECT * FROM users WHERE email = '${req.user.contributor_email}'`);
        const contributor_uid = result.rows[0].user_uid;

        const response = await client.query(`SELECT * FROM tasks WHERE user_uid = '${contributor_uid}'`);

        res.status(200).send(response.rows);
    } catch {
        res.status(400).send();
    }
});

router.patch("/tasks/:id", auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ["title", "description", "completed"];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    try {
        if (!isValidOperation) {
            throw new Error();
        }

        const result = await client.query(`SELECT * FROM tasks WHERE task_uid = '${req.params.id}'`);
        let task = result.rows[0];

        updates.forEach((update) => (task[update] = req.body[update]));
        let values = "";

        for (let i = 0; i < updates.length; i++) {
            values = values.concat(`${updates[i]} = '${req.body[updates[i]]}', `);
        }
        values = values.substring(0, values.length - 2);

        await client.query(`UPDATE tasks SET ${values} WHERE task_uid = '${req.params.id}'`);

        res.status(200).send(task);
    } catch {
        res.status(400).send();
    }
});

router.delete("/tasks/:id", auth, async (req, res) => {
    try {
        const result = await client.query(`SELECT * FROM tasks WHERE user_uid = '${req.user.user_uid}' AND task_uid = '${req.params.id}'`);

        if (!result.rows[0]) {
            throw new Error();
        }

        await client.query(`DELETE FROM tasks WHERE task_uid = '${req.params.id}'`);

        res.status(200).send(result.rows[0]);
    } catch {
        res.status(400).send();
    }
});

router.delete("/contributorTasks/:id", auth, async (req, res) => {
    try {
        const result = await client.query(`SELECT * FROM users WHERE email = '${req.user.contributor_email}'`);
        const contributor_uid = result.rows[0].user_uid;

        const response = await client.query(`SELECT * FROM tasks WHERE user_uid = '${contributor_uid}' AND task_uid = '${req.params.id}'`);

        if (!response.rows[0]) {
            throw new Error();
        }

        await client.query(`DELETE FROM tasks WHERE task_uid = '${req.params.id}'`);

        res.status(200).send(response.rows[0]);
    } catch {
        res.status(400).send();
    }
});

module.exports = router;