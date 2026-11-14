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
    this.lastError = null;
    this.authPath = path.join(__dirname, '..', '.wwebjs_auth');
  }

  emitState() {
    if (this.io) {
      this.io.emit('whatsapp_status', {
        status: this.status,
        qrCode: this.qrCodeDataUrl,
        userProfile: this.userProfile,
        error: this.lastError
      });
    }
  }

  async destroyExistingClient() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (e) {
        console.warn('[WhatsApp] Error al destruir cliente previo:', e.message);
      }
      this.client = null;
    }
  }

  async initialize() {
    // Si ya está listo o ya está en proceso de inicializar, no reiniciar
    if (this.client && (this.status === 'READY' || this.status === 'INITIALIZING')) {
      console.log('[WhatsApp] El cliente ya se encuentra en inicialización o listo.');
      return;
    }

    // Limpiar instancia previa si existía en estado erróneo o desconectado
    await this.destroyExistingClient();

    this.status = 'INITIALIZING';
    this.qrCodeDataUrl = null;
    this.lastError = null;
    this.emitState();
    console.log('[WhatsApp] Iniciando navegador Puppeteer para WhatsApp Web...');

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: this.authPath
        }),
        authTimeoutMs: 60000,
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        }
      });

      this.client.on('qr', async (qr) => {
        console.log('[WhatsApp] ¡Código QR recibido con éxito!');
        this.status = 'QR_READY';
        this.lastError = null;
        try {
          this.qrCodeDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 6 });
          console.log('[WhatsApp] Imagen QR generada y transmitida a la interfaz.');
        } catch (err) {
          console.error('[WhatsApp] Error convirtiendo QR a imagen:', err);
          this.lastError = 'Error generando imagen QR';
        }
        this.emitState();
      });

      this.client.on('authenticated', () => {
        console.log('[WhatsApp] Sesión autenticada.');
        this.status = 'AUTHENTICATED';
        this.qrCodeDataUrl = null;
        this.lastError = null;
        this.emitState();
      });

      this.client.on('auth_failure', async (msg) => {
        console.error('[WhatsApp] Fallo de autenticación:', msg);
        this.status = 'DISCONNECTED';
        this.qrCodeDataUrl = null;
        this.lastError = `Fallo de autenticación: ${msg}`;
        await this.destroyExistingClient();
        this.emitState();
      });

      this.client.on('ready', async () => {
        console.log('[WhatsApp] ¡Cliente listo para enviar mensajes!');
        this.status = 'READY';
        this.qrCodeDataUrl = null;
        this.lastError = null;
        try {
          const info = this.client.info;
          this.userProfile = {
            pushname: info?.pushname || 'Ximena Kumon',
            wid: info?.wid?.user || ''
          };
        } catch (e) {
          this.userProfile = { pushname: 'Ximena Kumon', wid: '' };
        }
        this.emitState();
      });

      this.client.on('disconnected', async (reason) => {
        console.log('[WhatsApp] Cliente desconectado:', reason);
        this.status = 'DISCONNECTED';
        this.qrCodeDataUrl = null;
        this.userProfile = null;
        await this.destroyExistingClient();
        this.emitState();
      });

      await this.client.initialize();
    } catch (err) {
      console.error('[WhatsApp] Error al inicializar cliente:', err.message);
      this.status = 'DISCONNECTED';
      this.lastError = err.message;
      await this.destroyExistingClient();
      this.emitState();
    }
  }

  async logout() {
    this.status = 'DISCONNECTED';
    this.qrCodeDataUrl = null;
    this.userProfile = null;
    this.lastError = null;

    if (this.client) {
      try {
        await this.client.logout();
      } catch (e) {
        console.warn('[WhatsApp] Error durante logout:', e.message);
      }
      await this.destroyExistingClient();
    }

    this.emitState();
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
