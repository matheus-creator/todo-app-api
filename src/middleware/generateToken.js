const jwt = require('jsonwebtoken');

const generateToken = (user_uid) => {
    const token = jwt.sign({ id: user_uid }, process.env.JWT_SECRET, { expiresIn: '1000s' });
    return token;
}

module.exports = generateToken;