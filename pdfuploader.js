const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDF = require('./model/pdf.model');
require('dotenv').config();
const Connection = require('./db');

const app = express();

Connection(process.env.MONGODB_URL);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type, only PDF is allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

app.use('/uploads', express.static('uploads'));

app.post('/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'Please upload a PDF file!' });
    }

    try {
        const pdf = new PDF({
            filename: req.file.filename,
            filePath: `/uploads/${req.file.filename}`
        });

        await pdf.save();

        res.send({
            message: 'PDF uploaded and saved successfully!',
            pdf
        });
    } catch (error) {
        console.error('Error saving PDF metadata:', error);
        res.status(500).send({ message: 'Error saving PDF metadata' });
    }
});

app.get('/pdf/:id', async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf) {
            return res.status(404).send({ message: 'PDF not found' });
        }

        const filePath = path.join(__dirname, pdf.filePath);
        console.log(pdf.filePath);
        console.log(filePath);
        fs.exists(filePath, (exists) => {
            if (exists) {
                res.sendFile(filePath);
            } else {
                res.status(404).send({ message: 'File not found' });
            }
        });
    } catch (error) {
        console.error('Error fetching PDF:', error);
        res.status(500).send({ message: 'Error fetching PDF' });
    }
});

app.delete('/pdf/:id', async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf) {
            return res.status(404).send({ message: 'PDF not found' });
        }

        const filePath = path.join(__dirname, pdf.filePath);

        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return res.status(500).send({ message: 'Error deleting file' });
            }

            await PDF.findByIdAndDelete(req.params.id);
            res.send({ message: 'PDF deleted successfully!' });
        });
    } catch (error) {
        console.error('Error deleting PDF:', error);
        res.status(500).send({ message: 'Error deleting PDF' });
    }
});

app.put('/pdf/:id', upload.single('pdf'), async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf) {
            return res.status(404).send({ message: 'PDF not found' });
        }

        if (req.file) {
            const oldFilePath = path.join(__dirname, pdf.filePath);

            fs.unlink(oldFilePath, (err) => {
                if (err) {
                    console.error('Error deleting old file:', err);
                }
            });
            pdf.filename = req.file.filename;
            pdf.filePath = `/uploads/${req.file.filename}`;
        }
        await pdf.save();

        res.send({
            message: 'PDF updated successfully!',
            pdf
        });
    } catch (error) {
        console.error('Error updating PDF:', error);
        res.status(500).send({ message: 'Error updating PDF' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
