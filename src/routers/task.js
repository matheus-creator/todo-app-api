const express = require('express');
const router = new express.Router();
const client = require('../connection');
const auth = require('../middleware/auth');

router.post('/tasks', auth, async (req, res) => {
    const task = req.body;
    const values = `uuid_generate_v4(), '${task.title}', '${task.description}', '${task.completed}', '${req.user.user_uid}'`;

    await client.query(`INSERT INTO tasks (task_uid, title, description, completed, user_uid) VALUES (${values}) RETURNING *`).then(result => {
        res.status(201).send(result.rows[0]);
    }).catch(err => {
        res.status(400).send(err);
    });

    client.end;
});

router.get('/tasks', auth, async (req, res) => {
    await client.query(`SELECT * FROM tasks WHERE user_uid = '${req.user.user_uid}'`).then(result => {
        res.status(200).send(result.rows);
    }).catch(err => {
        res.status(500).send(err);
    });
    
    client.end;
});

router.get('/tasks/:id', auth, async (req, res) => {
    await client.query(`SELECT * FROM tasks WHERE user_uid = '${req.user.user_uid}' AND task_uid = '${req.params.id}'`).then(result => {
        if (!result.rows[0]) {
            return res.status(404).send();
        }
        res.status(200).send(result.rows[0]);
    }).catch(err => {
        res.status(500).send(err);
    });
    
    client.end;
});

router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'description', 'completed'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    let task;
    let values = '';

    await client.query(`SELECT * FROM tasks WHERE task_uid = '${req.params.id}'`).then(result => {
        task = result.rows[0];
    }).catch(err => {
        return res.status(404).send();
    });

    updates.forEach(update => task[update] = req.body[update]);

    for (let i = 0; i < updates.length; i++) {
        values = values.concat(`${updates[i]} = '${req.body[updates[i]]}', `);
    }
    values = values.substring(0, values.length - 2);

    await client.query(`UPDATE tasks SET ${values} WHERE task_uid = '${req.params.id}'`).then(result => {
        res.status(200).send(task);
    }).catch(err => {
        res.status(400).send(err);
    });
    
    client.end;
});

router.delete('/tasks/:id', auth, async (req, res) => {
    await client.query(`SELECT * FROM tasks WHERE user_uid = '${req.user.user_uid}' AND task_uid = '${req.params.id}'`).then( async (result) => {
        if (!result.rows[0]) {
            return res.status(404).send();
        }
        res.status(200).send(result.rows[0]);

        await client.query(`DELETE FROM tasks WHERE task_uid = '${req.params.id}'`).catch(err => {
            throw new Error(err);
        });
    }).catch(err => {
        res.status(500).send(err);
    });
    
    client.end;
});

module.exports = router;