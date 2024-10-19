const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
    filename: String,
    filePath: String,
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

const PDF = mongoose.model('PDF', pdfSchema);

module.exports = PDF;