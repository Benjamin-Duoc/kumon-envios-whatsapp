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

  async exportWhatsAppContacts(limit = null, savedOnly = false) {
    if (!this.isReady()) {
      throw new Error('Debes conectar WhatsApp primero para poder extraer tus contactos.');
    }

    console.log(`[WhatsApp] Extrayendo lista de contactos (Límite: ${limit || 'Todos'}, Solo guardados: ${savedOnly})...`);
    const rawContacts = await this.client.getContacts();

    // Filtrar contactos válidos (personas reales, excluir grupos, LIDs y cuentas de sistema)
    const validContacts = [];
    const seenPhones = new Set();

    for (const c of rawContacts) {
      if (c.isGroup) continue;
      if (savedOnly && !c.isMyContact) continue;

      // Descartar identificadores internos LID (Linked Identity), canales y estados
      if (c.id && c.id.server && c.id.server !== 'c.us') continue;

      const serialized = c.id && c.id._serialized ? c.id._serialized : '';
      if (serialized.includes('@lid') || serialized.includes('status') || serialized.includes('broadcast') || serialized.includes('newsletter')) {
        continue;
      }

      // Limpiar solo dígitos y validar longitud internacional real (8 a 14 dígitos)
      const rawPhone = String(c.number || (c.id && c.id.user) || '').replace(/[^\d]/g, '');
      if (!rawPhone || rawPhone.length < 8 || rawPhone.length > 14) continue;

      // Evitar que el mismo número aparezca repetido
      if (seenPhones.has(rawPhone)) continue;
      seenPhones.add(rawPhone);

      const displayName = c.name || c.pushname || `Contacto (+${rawPhone})`;
      validContacts.push({
        Nombre: displayName,
        Telefono: `+${rawPhone}`,
        Alumno: displayName, // Valor inicial sugerido
        Materia: 'Matemáticas y Lenguaje',
        GuardadoEnAgenda: c.isMyContact ? 'Sí' : 'No'
      });

      if (limit && limit > 0 && validContacts.length >= limit) {
        break;
      }
    }

    console.log(`[WhatsApp] Se extrajeron ${validContacts.length} contactos válidos.`);
    return validContacts;
  }

  isReady() {
    return this.status === 'READY' && this.client !== null;
  }

  async getNumberId(number) {
    if (!this.isReady()) return null;
    try {
      return await this.client.getNumberId(number);
    } catch (e) {
      console.warn('[WhatsApp] Error consultando ID de número:', e.message);
      return null;
    }
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
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Archivo multimedia no encontrado: ${absPath}`);
    }
    const media = MessageMedia.fromFilePath(absPath);
    return await this.client.sendMessage(toJid, media, { caption });
  }
}

module.exports = WhatsAppManager;
