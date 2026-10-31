const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const WhatsAppManager = require('./whatsappManager');
const SenderEngine = require('./senderEngine');
const { parseContactsFile, loadTestContacts } = require('./contactsParser');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Carpetas de trabajo
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuración de subida de archivos (Multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/data', express.static(path.join(__dirname, '..', 'data')));

// Instancias de WhatsApp y Motor de Envíos
const whatsapp = new WhatsAppManager(io);
const sender = new SenderEngine(io, whatsapp);

// Rutas de API

// 1. Obtener datos de prueba
app.get('/api/test-contacts', (req, res) => {
  try {
    const testData = loadTestContacts();
    res.json({ success: true, data: testData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Subir archivo Excel o CSV de contactos
app.post('/api/upload-contacts', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se subió ningún archivo.' });
    }
    const parsedData = parseContactsFile(req.file.path);
    res.json({ success: true, data: parsedData, filename: req.file.originalname });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Subir imagen o flyer adjunto
app.post('/api/upload-media', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se adjuntó imagen.' });
    }
    res.json({
      success: true,
      filePath: req.file.path,
      url: `/uploads/${path.basename(req.file.path)}`,
      filename: req.file.originalname
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Estado de los servicios
app.get('/api/status', (req, res) => {
  res.json({
    whatsapp: {
      status: whatsapp.status,
      userProfile: whatsapp.userProfile,
      qrCode: whatsapp.qrCodeDataUrl
    },
    sender: {
      state: sender.state,
      stats: sender.stats
    }
  });
});

// 5. Iniciar conexión WhatsApp
app.post('/api/whatsapp/connect', async (req, res) => {
  try {
    whatsapp.initialize();
    res.json({ success: true, message: 'Inicializando conexión de WhatsApp...' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Cerrar sesión WhatsApp
app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    await whatsapp.logout();
    res.json({ success: true, message: 'Sesión de WhatsApp cerrada.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Controles del motor de envío
app.post('/api/sender/start', async (req, res) => {
  try {
    const result = await sender.start(req.body);
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/sender/pause', (req, res) => {
  sender.pause();
  res.json({ success: true, message: 'Campaña pausada.' });
});

app.post('/api/sender/resume', (req, res) => {
  sender.resume();
  res.json({ success: true, message: 'Campaña reanudada.' });
});

app.post('/api/sender/stop', (req, res) => {
  sender.stop();
  res.json({ success: true, message: 'Detención solicitada.' });
});

// Socket.io eventos iniciales al conectar un cliente
io.on('connection', (socket) => {
  socket.emit('whatsapp_status', {
    status: whatsapp.status,
    qrCode: whatsapp.qrCodeDataUrl,
    userProfile: whatsapp.userProfile
  });

  socket.emit('sender_status', {
    state: sender.state,
    stats: sender.stats
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Sistema de Envío Masivo WhatsApp (Kumon Los Presidentes)`);
  console.log(`🌐 Interfaz disponible en: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});

