const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Image = require('./model/image.model');
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type, only images (jpg, png, gif) are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

app.use('/uploads', express.static('uploads'));

app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'Please upload an image!' });
    }

    try {
        const image = new Image({
            filename: req.file.filename,
            filePath: `/uploads/${req.file.filename}`
        });

        await image.save();

        res.send({
            message: 'Image uploaded and saved successfully!',
            image
        });
    } catch (error) {
        console.error('Error saving image metadata:', error);
        res.status(500).send({ message: 'Error saving image metadata' });
    }
});

app.get('/image/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);

        if (!image) {
            return res.status(404).send({ message: 'Image not found' });
        }

        const filePath = path.join(__dirname, image.filePath);
        fs.exists(filePath, (exists) => {
            if (exists) {
                res.sendFile(filePath);
            } else {
                res.status(404).send({ message: 'File not found' });
            }
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).send({ message: 'Error fetching image' });
    }
});

app.delete('/image/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);

        if (!image) {
            return res.status(404).send({ message: 'Image not found' });
        }

        const filePath = path.join(__dirname, image.filePath);

        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return res.status(500).send({ message: 'Error deleting file' });
            }

            await Image.findByIdAndDelete(req.params.id);
            res.send({ message: 'Image deleted successfully!' });
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).send({ message: 'Error deleting image' });
    }
});

app.put('/image/:id', upload.single('image'), async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);

        if (!image) {
            return res.status(404).send({ message: 'Image not found' });
        }

        if (req.file) {
            const oldFilePath = path.join(__dirname, image.filePath);
            fs.unlink(oldFilePath, (err) => {
                if (err) {
                    console.error('Error deleting old file:', err);
                }
            });
            image.filename = req.file.filename;
            image.filePath = `/uploads/${req.file.filename}`;
        }
        await image.save();

        res.send({
            message: 'Image updated successfully!',
            image
        });
    } catch (error) {
        console.error('Error updating image:', error);
        res.status(500).send({ message: 'Error updating image' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
