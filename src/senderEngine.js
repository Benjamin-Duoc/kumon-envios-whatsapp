const fs = require('fs');
const path = require('path');

class SenderEngine {
  constructor(io, whatsappManager) {
    this.io = io;
    this.whatsapp = whatsappManager;

    this.state = 'IDLE'; // IDLE, RUNNING, PAUSED, STOPPING
    this.currentCampaign = null;
    this.currentIndex = 0;
    this.shouldStop = false;
    this.isPaused = false;

    this.stats = {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };
  }

  log(message, type = 'info') {
    const entry = {
      timestamp: new Date().toLocaleTimeString('es-CL'),
      type, // 'info', 'success', 'warning', 'error'
      message
    };
    console.log(`[Sender][${entry.type.toUpperCase()}] ${entry.message}`);
    if (this.io) {
      this.io.emit('sender_log', entry);
    }
  }

  emitProgress(contact, result) {
    if (this.io) {
      const percent = this.stats.total > 0 ? Math.round(((this.currentIndex + 1) / this.stats.total) * 100) : 0;
      this.io.emit('sender_progress', {
        currentIndex: this.currentIndex + 1,
        total: this.stats.total,
        percent,
        stats: this.stats,
        currentContact: {
          id: contact.id,
          name: contact.name,
          phone: contact.displayPhone,
          status: result.status,
          error: result.error || null,
          previewText: result.previewText || ''
        }
      });
    }
  }

  renderTemplate(template, variables = {}) {
    if (!template) return '';
    let rendered = template;
    // Reemplaza {clave} o {Clave}
    Object.keys(variables).forEach((key) => {
      const val = variables[key] || '';
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      rendered = rendered.replace(regex, val);
    });
    return rendered;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRandomDelay(minSec, maxSec) {
    const min = Math.max(1, minSec);
    const max = Math.max(min, maxSec);
    const delaySec = Math.floor(Math.random() * (max - min + 1)) + min;
    return delaySec * 1000;
  }

  async start(options) {
    if (this.state === 'RUNNING') {
      throw new Error('Ya hay un envío en curso.');
    }

    const {
      contacts = [],
      messageTemplate = '',
      imagePath = null,
      mode = 'simulation', // 'simulation' o 'live'
      minDelaySeconds = 4,
      maxDelaySeconds = 8,
      batchSize = 25,
      batchPauseSeconds = 30
    } = options;

    if (!contacts || contacts.length === 0) {
      throw new Error('No hay contactos en la lista.');
    }

    if (mode === 'live' && !this.whatsapp.isReady()) {
      throw new Error('WhatsApp no está conectado. Escanea el código QR o activa el "Modo Simulación" para probar sin enviar.');
    }

    this.state = 'RUNNING';
    this.shouldStop = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.currentCampaign = { contacts, messageTemplate, imagePath, mode, minDelaySeconds, maxDelaySeconds, batchSize, batchPauseSeconds };

    this.stats = {
      total: contacts.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
      endTime: null
    };

    this.log(`🚀 Iniciando campaña [Modo: ${mode === 'simulation' ? 'SIMULACIÓN (Pruebas)' : 'ENVÍO REAL'}] para ${contacts.length} contactos.`, 'info');
    if (this.io) {
      this.io.emit('sender_status', { state: this.state, mode, stats: this.stats });
    }

    // Iniciar ciclo de envío en background
    this.runQueue().catch((err) => {
      this.log(`Error crítico en la cola de envío: ${err.message}`, 'error');
      this.state = 'IDLE';
      if (this.io) this.io.emit('sender_status', { state: this.state, mode, stats: this.stats });
    });

    return { status: 'started', total: contacts.length, mode };
  }

  pause() {
    if (this.state === 'RUNNING') {
      this.isPaused = true;
      this.state = 'PAUSED';
      this.log('⏸️ Campaña en pausa.', 'warning');
      if (this.io) this.io.emit('sender_status', { state: this.state, stats: this.stats });
    }
  }

  resume() {
    if (this.state === 'PAUSED') {
      this.isPaused = false;
      this.state = 'RUNNING';
      this.log('▶️ Campaña reanudada.', 'info');
      if (this.io) this.io.emit('sender_status', { state: this.state, stats: this.stats });
    }
  }

  stop() {
    if (this.state === 'RUNNING' || this.state === 'PAUSED') {
      this.shouldStop = true;
      this.isPaused = false;
      this.state = 'STOPPING';
      this.log('🛑 Solicitud de detención recibida. Finalizando...', 'warning');
    }
  }

  async runQueue() {
    const { contacts, messageTemplate, imagePath, mode, minDelaySeconds, maxDelaySeconds, batchSize, batchPauseSeconds } = this.currentCampaign;

    for (let i = 0; i < contacts.length; i++) {
      this.currentIndex = i;

      // Manejar solicitud de detención
      if (this.shouldStop) {
        this.log(`Campaña cancelada por el usuario en el contacto ${i + 1} de ${contacts.length}.`, 'warning');
        break;
      }

      // Manejar pausa
      while (this.isPaused) {
        await this.sleep(1000);
        if (this.shouldStop) break;
      }
      if (this.shouldStop) break;

      const contact = contacts[i];
      const personalizedMessage = this.renderTemplate(messageTemplate, {
        nombre: contact.name,
        ...contact.variables
      });

      // Validar teléfono
      if (!contact.isValidPhone) {
        this.stats.skipped++;
        this.log(`⚠️ Saltado: ${contact.name} (${contact.rawPhone}) - ${contact.invalidReason}`, 'warning');
        this.emitProgress(contact, {
          status: 'skipped',
          error: contact.invalidReason,
          previewText: personalizedMessage
        });
        continue;
      }

      // Ejecutar envío
      try {
        if (mode === 'simulation') {
          // Simulación segura (demora entre 1 y 2 segundos para prueba ágil)
          await this.sleep(1200);
          this.stats.sent++;
          this.log(`[SIMULACIÓN] Mensaje simulado exitosamente para ${contact.name} (${contact.displayPhone})`, 'success');
          this.emitProgress(contact, {
            status: 'sent',
            previewText: personalizedMessage
          });
        } else {
          // Envío real por WhatsApp Web
          if (imagePath && fs.existsSync(imagePath)) {
            await this.whatsapp.sendMediaMessage(contact.jid, imagePath, personalizedMessage);
          } else {
            await this.whatsapp.sendTextMessage(contact.jid, personalizedMessage);
          }

          this.stats.sent++;
          this.log(`✅ Enviado a ${contact.name} (${contact.displayPhone})`, 'success');
          this.emitProgress(contact, {
            status: 'sent',
            previewText: personalizedMessage
          });

          // Delay de seguridad anti-baneo solo en envíos reales
          if (i < contacts.length - 1) {
            const delay = this.getRandomDelay(minDelaySeconds, maxDelaySeconds);
            this.log(`⏳ Esperando ${(delay / 1000).toFixed(1)}s antes del próximo contacto (Anti-Bloqueo)...`, 'info');
            await this.sleep(delay);

            // Pausa por lotes (Batching)
            if ((i + 1) % batchSize === 0) {
              this.log(`☕ Pausa preventiva de lote: esperando ${batchPauseSeconds}s tras enviar ${batchSize} mensajes...`, 'info');
              await this.sleep(batchPauseSeconds * 1000);
            }
          }
        }
      } catch (err) {
        this.stats.failed++;
        this.log(`❌ Error al enviar a ${contact.name} (${contact.displayPhone}): ${err.message}`, 'error');
        this.emitProgress(contact, {
          status: 'failed',
          error: err.message,
          previewText: personalizedMessage
        });
      }
    }

    this.stats.endTime = Date.now();
    const durationSec = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
    this.state = 'IDLE';

    this.log(`🏁 Proceso completado en ${durationSec}s. Enviados: ${this.stats.sent} | Fallidos: ${this.stats.failed} | Omitidos: ${this.stats.skipped}`, 'info');

    if (this.io) {
      this.io.emit('sender_completed', {
        stats: this.stats,
        durationSeconds: durationSec
      });
      this.io.emit('sender_status', { state: this.state, stats: this.stats });
    }
  }
}

module.exports = SenderEngine;

