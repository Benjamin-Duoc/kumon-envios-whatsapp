const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppManager {
  constructor(io) {
    this.io = io;
    this.client = null;
    this.status = 'DISCONNECTED'; // DISCONNECTED, INITIALIZING, QR_READY, AUTHENTICATED, READY
    this.qrCodeDataUrl = null;
    this.userProfile = null;
    this.authPath = path.join(__dirname, '..', '.wwebjs_auth');
  }

  emitState() {
    if (this.io) {
      this.io.emit('whatsapp_status', {
        status: this.status,
        qrCode: this.qrCodeDataUrl,
        userProfile: this.userProfile
      });
    }
  }

  async initialize() {
    if (this.client && (this.status === 'READY' || this.status === 'INITIALIZING')) {
      return;
    }

    this.status = 'INITIALIZING';
    this.qrCodeDataUrl = null;
    this.emitState();

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: this.authPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      this.client.on('qr', async (qr) => {
        console.log('[WhatsApp] Nuevo código QR generado.');
        this.status = 'QR_READY';
        try {
          this.qrCodeDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 6 });
        } catch (err) {
          console.error('[WhatsApp] Error convirtiendo QR:', err);
        }
        this.emitState();
      });

      this.client.on('authenticated', () => {
        console.log('[WhatsApp] Sesión autenticada.');
        this.status = 'AUTHENTICATED';
        this.qrCodeDataUrl = null;
        this.emitState();
      });

      this.client.on('auth_failure', (msg) => {
        console.error('[WhatsApp] Fallo de autenticación:', msg);
        this.status = 'DISCONNECTED';
        this.qrCodeDataUrl = null;
        this.emitState();
      });

      this.client.on('ready', async () => {
        console.log('[WhatsApp] ¡Cliente listo para enviar mensajes!');
        this.status = 'READY';
        this.qrCodeDataUrl = null;
        try {
          const info = this.client.info;
          this.userProfile = {
            pushname: info?.pushname || 'Ximena Kumon',
            wid: info?.wid?.user || ''
          };
        } catch (e) {
          this.userProfile = { pushname: 'Usuario Conectado', wid: '' };
        }
        this.emitState();
      });

      this.client.on('disconnected', (reason) => {
        console.log('[WhatsApp] Desconectado:', reason);
        this.status = 'DISCONNECTED';
        this.qrCodeDataUrl = null;
        this.userProfile = null;
        this.emitState();
      });

      await this.client.initialize();
    } catch (err) {
      console.error('[WhatsApp] Error al inicializar cliente:', err);
      this.status = 'DISCONNECTED';
      this.emitState();
    }
  }

  async logout() {
    if (this.client) {
      try {
        await this.client.logout();
        await this.client.destroy();
      } catch (e) {
        console.warn('[WhatsApp] Error durante logout:', e.message);
      }
      this.client = null;
      this.status = 'DISCONNECTED';
      this.qrCodeDataUrl = null;
      this.userProfile = null;
      this.emitState();
    }
  }

  isReady() {
    return this.status === 'READY' && this.client !== null;
  }

  async sendTextMessage(toJid, messageText) {
    if (!this.isReady()) {
      throw new Error('El cliente de WhatsApp no está conectado.');
    }
    return await this.client.sendMessage(toJid, messageText);
  }

  async sendMediaMessage(toJid, filePath, caption = '') {
    if (!this.isReady()) {
      throw new Error('El cliente de WhatsApp no está conectado.');
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo multimedia no encontrado: ${filePath}`);
    }
    const media = MessageMedia.fromFilePath(filePath);
    return await this.client.sendMessage(toJid, media, { caption });
  }
}

module.exports = WhatsAppManager;

