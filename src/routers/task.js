const express = require('express');
const router = new express.Router();
const client = require('../connection');

router.get('/tasks/:id', (req, res) => {
    client.query(`SELECT * FROM tasks WHERE user_uid = '${req.params.id}'`, (err, result) => {
        if(!err) {
            res.send(result.rows);
        }
    });
    client.end;
});

module.exports = router;