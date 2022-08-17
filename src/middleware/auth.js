const jwt = require("jsonwebtoken");
const client = require("../connection");

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_uid = decoded.id;

        const result = await client.query(`SELECT * FROM users WHERE user_uid = '${user_uid}'`);
        const user = result.rows[0];

        req.token = token;
        req.user = user;
        next();
    } catch {
        res.clearCookie("token");
        res.status(401).send({ error: "Please authenticate." });
    }
};

module.exports = auth;
