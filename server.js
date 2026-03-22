const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Create uploads folder automatically ─────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Storage config ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
                       .replace(/[^a-zA-Z0-9._-]/g, '_')
                       .slice(0, 60);
    const shortId  = Math.random().toString(36).slice(2, 7);
    cb(null, `${baseName}_${shortId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max
});

// ── Static frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Upload endpoint ──────────────────────────────────────────────────────────
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });

  const host         = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol     = req.headers['x-forwarded-proto'] || 'https';
  const downloadLink = `${protocol}://${host}/download/${req.file.filename}`;

  res.json({
    success:  true,
    filename: req.file.originalname,
    size:     req.file.size,
    link:     downloadLink
  });
});

// ── Download endpoint ────────────────────────────────────────────────────────
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  res.download(filePath);
});

// ── List files ───────────────────────────────────────────────────────────────
app.get('/files', (req, res) => {
  const files = fs.readdirSync(uploadsDir).map(f => ({
    stored: f,
    link:   `/download/${f}`
  }));
  res.json(files);
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running → port ${PORT}`);
});
