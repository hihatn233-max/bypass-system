require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Đã kết nối MongoDB'))
    .catch(err => console.log('Lỗi DB:', err));

const LinkSchema = new mongoose.Schema({
    originalUrl: { type: String, required: true },
    shortId: { type: String, required: true, unique: true, default: shortid.generate },
    clicks: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const Link = mongoose.model('Link', LinkSchema);

app.post('/api/admin/create', async (req, res) => {
    const { originalUrl, password } = req.body;
    if (password !== process.env.ADMIN_PASS) return res.status(403).json({ error: 'Sai mật khẩu Admin!' });
    
    try {
        const newLink = new Link({ originalUrl });
        await newLink.save();
        res.json({ success: true, shortUrl: `${req.headers.host}/${newLink.shortId}` });
    } catch (e) {
        res.status(500).json({ error: 'Lỗi tạo link!' });
    }
});

app.post('/api/admin/list', async (req, res) => {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASS) return res.status(403).json({ error: 'Sai mật khẩu Admin!' });
    
    const links = await Link.find().sort({ createdAt: -1 });
    res.json(links);
});

app.post('/api/verify', async (req, res) => {
    const { id } = req.body;
    const link = await Link.findOne({ shortId: id });
    if (!link) return res.status(404).json({ error: 'Link lỗi hoặc không tồn tại!' });
    
    link.clicks += 1;
    await link.save();
    
    res.json({ success: true, url: link.originalUrl });
});

app.get('/:id', async (req, res) => {
    if (req.params.id.includes('.')) return res.status(404).send('Not found');
    const link = await Link.findOne({ shortId: req.params.id });
    if (link) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).send('404 Not Found');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chạy tại port ${PORT}`));
