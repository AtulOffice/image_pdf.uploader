const mongoose = require('mongoose');


const Connection = (url) => {
    mongoose.connect(url)
        .then(() => console.log('MongoDB connected'))
        .catch(err => console.log('MongoDB connection error:', err));
}

module.exports = Connection;
