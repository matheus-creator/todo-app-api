const jwt = require('jsonwebtoken');

const generateToken = (user_uid, expirationTime) => {
    if (expirationTime === 'never') {
        return jwt.sign({ id: user_uid }, process.env.JWT_SECRET);
    }
    return jwt.sign({ id: user_uid }, process.env.JWT_SECRET, { expiresIn: expirationTime });
}

module.exports = generateToken;