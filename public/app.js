// Instancia de Socket.io
const socket = io();

// Estado de la aplicación
const state = {
  contacts: [],
  availableTags: [],
  selectedMedia: null,
  mode: 'simulation', // 'simulation' o 'live'
  engineState: 'IDLE',
  stats: { total: 0, sent: 0, failed: 0, skipped: 0 },
  selectedPreviewIndex: 0,
  whatsappStatus: 'DISCONNECTED'
};

// Plantillas predeterminadas
const TEMPLATES = {
  reviews: `¡Hola {nombre}! Esperamos que estés muy bien.

En *Kumon Los Presidentes*, acompañar el crecimiento y aprendizaje de *{alumno}* en *{materia}* es un verdadero orgullo para nosotros.

Nos ayudaría muchísimo que pudieras dedicarnos 1 minuto para dejarnos tu opinión y una calificación de 5 estrellas en nuestro perfil de Google:
👉 *https://g.page/r/kumon-los-presidentes/review*

¡Muchas gracias por tu constante apoyo y confianza!
Con cariño,
*Ximena – Orientadora Kumon Los Presidentes*`,

  progress: `¡Hola {nombre}! Te saludamos desde *Kumon Los Presidentes*.

Queremos felicitar a *{alumno}* por su excelente constancia y disciplina en sus hojas de estudio de *{materia}*. Los 26 años guiando a nuestros alumnos nos demuestran que el esfuerzo diario construye un gran futuro.

Cualquier consulta sobre sus horarios o material, estamos a tu disposición por este canal.
¡Que tengan una excelente semana!`
};

// Elementos del DOM
const el = {
  waBadge: document.getElementById('wa-badge'),
  waStatusText: document.getElementById('wa-status-text'),
  btnOpenQrModal: document.getElementById('btn-open-qr-modal'),
  qrModal: document.getElementById('qr-modal'),
  btnCloseQrModal: document.getElementById('btn-close-qr-modal'),
  qrLoading: document.getElementById('qr-loading'),
  qrImage: document.getElementById('qr-image'),
  qrConnectedCard: document.getElementById('qr-connected-card'),
  qrUserName: document.getElementById('qr-user-name'),
  btnModalReconnect: document.getElementById('btn-modal-reconnect'),
  btnModalDisconnect: document.getElementById('btn-modal-disconnect'),

  btnLoadTestData: document.getElementById('btn-load-test-data'),
  dropZone: document.getElementById('drop-zone'),
  contactsFileInput: document.getElementById('contacts-file-input'),
  contactsSummaryBox: document.getElementById('contacts-summary-box'),
  contactsFileName: document.getElementById('contacts-file-name'),
  validContactsBadge: document.getElementById('valid-contacts-badge'),
  invalidContactsBadge: document.getElementById('invalid-contacts-badge'),
  tagsContainer: document.getElementById('tags-container'),

  messageText: document.getElementById('message-text'),
  charCounter: document.getElementById('char-counter'),
  btnTplReviews: document.getElementById('btn-tpl-reviews'),
  btnTplProgress: document.getElementById('btn-tpl-progress'),

  mediaFileInput: document.getElementById('media-file-input'),
  btnSelectMedia: document.getElementById('btn-select-media'),
  btnUseTestFlyer: document.getElementById('btn-use-test-flyer'),
  mediaPreviewBox: document.getElementById('media-preview-box'),
  mediaThumb: document.getElementById('media-thumb'),
  mediaName: document.getElementById('media-name'),
  btnRemoveMedia: document.getElementById('btn-remove-media'),

  modeBtnSimulation: document.getElementById('mode-btn-simulation'),
  modeBtnLive: document.getElementById('mode-btn-live'),
  modeNotice: document.getElementById('mode-notice'),
  minDelay: document.getElementById('min-delay'),
  maxDelay: document.getElementById('max-delay'),
  batchSize: document.getElementById('batch-size'),
  batchPause: document.getElementById('batch-pause'),

  previewContactName: document.getElementById('preview-contact-name'),
  phonePreviewMedia: document.getElementById('phone-preview-media'),
  phonePreviewImg: document.getElementById('phone-preview-img'),
  phonePreviewText: document.getElementById('phone-preview-text'),

  btnStart: document.getElementById('btn-start'),
  startBtnLabel: document.getElementById('start-btn-label'),
  btnPause: document.getElementById('btn-pause'),
  btnStop: document.getElementById('btn-stop'),
  progressBar: document.getElementById('progress-bar'),
  progressPercent: document.getElementById('progress-percent'),
  progressStatusLabel: document.getElementById('progress-status-label'),
  statSent: document.getElementById('stat-sent'),
  statFailed: document.getElementById('stat-failed'),
  statSkipped: document.getElementById('stat-skipped'),
  statTotal: document.getElementById('stat-total'),

  logConsole: document.getElementById('log-console'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  contactsTableBody: document.getElementById('contacts-table-body'),
  tableCount: document.getElementById('table-count')
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
function init() {
  // Cargar plantilla por defecto
  el.messageText.value = TEMPLATES.reviews;
  updateCharCounter();

  // Listeners de interfaz
  setupEventListeners();

  // Cargar datos de prueba automáticamente al arrancar para agilizar
  loadTestData();
}

// ==========================================
// LISTENERS DE EVENTOS UI
// ==========================================
function setupEventListeners() {
  // Modal QR
  el.btnOpenQrModal.addEventListener('click', () => {
    el.qrModal.classList.remove('hidden');
    if (state.whatsappStatus === 'DISCONNECTED') {
      fetch('/api/whatsapp/connect', { method: 'POST' });
    }
  });

  el.btnCloseQrModal.addEventListener('click', () => el.qrModal.classList.add('hidden'));

  el.btnModalReconnect.addEventListener('click', () => {
    el.qrLoading.classList.remove('hidden');
    el.qrImage.classList.add('hidden');
    el.qrConnectedCard.classList.add('hidden');
    fetch('/api/whatsapp/connect', { method: 'POST' });
  });

  el.btnModalDisconnect.addEventListener('click', () => {
    if (confirm('¿Cerrar la sesión de WhatsApp de Ximena en este equipo?')) {
      fetch('/api/whatsapp/disconnect', { method: 'POST' });
    }
  });

  // Carga de Contactos
  el.btnLoadTestData.addEventListener('click', loadTestData);

  el.dropZone.addEventListener('click', () => el.contactsFileInput.click());
  el.contactsFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) uploadContactsFile(e.target.files[0]);
  });

  el.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.dropZone.classList.add('border-sky-500', 'bg-sky-50/50');
  });

  el.dropZone.addEventListener('dragleave', () => {
    el.dropZone.classList.remove('border-sky-500', 'bg-sky-50/50');
  });

  el.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.dropZone.classList.remove('border-sky-500', 'bg-sky-50/50');
    if (e.dataTransfer.files.length > 0) uploadContactsFile(e.dataTransfer.files[0]);
  });

  // Mensaje y Plantillas
  el.messageText.addEventListener('input', () => {
    updateCharCounter();
    updatePhonePreview();
  });

  el.btnTplReviews.addEventListener('click', () => {
    el.messageText.value = TEMPLATES.reviews;
    updateCharCounter();
    updatePhonePreview();
  });

  el.btnTplProgress.addEventListener('click', () => {
    el.messageText.value = TEMPLATES.progress;
    updateCharCounter();
    updatePhonePreview();
  });

  // Manejo de Imágenes
  el.btnSelectMedia.addEventListener('click', () => el.mediaFileInput.click());
  el.mediaFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) uploadMediaFile(e.target.files[0]);
  });

  el.btnUseTestFlyer.addEventListener('click', () => {
    // Usar imagen de prueba ya generada
    state.selectedMedia = {
      filePath: 'data/imagen_prueba.png',
      url: '/data/imagen_prueba.png',
      filename: 'Afiche_Kumon_26_Anos.png'
    };
    renderMediaPreview();
  });

  el.btnRemoveMedia.addEventListener('click', () => {
    state.selectedMedia = null;
    el.mediaPreviewBox.classList.add('hidden');
    el.phonePreviewMedia.classList.add('hidden');
    el.mediaFileInput.value = '';
  });

  // Selector de Modo
  el.modeBtnSimulation.addEventListener('click', () => setMode('simulation'));
  el.modeBtnLive.addEventListener('click', () => setMode('live'));

  // Acciones de Envío
  el.btnStart.addEventListener('click', handleStartButtonClick);
  el.btnPause.addEventListener('click', () => {
    if (state.engineState === 'RUNNING') {
      fetch('/api/sender/pause', { method: 'POST' });
    } else if (state.engineState === 'PAUSED') {
      fetch('/api/sender/resume', { method: 'POST' });
    }
  });
  el.btnStop.addEventListener('click', () => {
    if (confirm('¿Seguro que deseas detener el envío en curso?')) {
      fetch('/api/sender/stop', { method: 'POST' });
    }
  });

  el.btnClearLogs.addEventListener('click', () => {
    el.logConsole.innerHTML = '<div class="text-slate-500">[Sistema] Logs limpiados.</div>';
  });
}

// ==========================================
// FUNCIONES DE CARGA Y PARSING
// ==========================================
async function loadTestData() {
  try {
    addLog('Cargando 5 contactos de prueba (Kumon Los Presidentes)...', 'info');
    const res = await fetch('/api/test-contacts');
    const json = await res.json();
    if (json.success) {
      applyLoadedContacts(json.data, 'contactos_prueba.xlsx');
      addLog('✅ Datos de prueba cargados correctamente.', 'success');
    } else {
      addLog(`Error al cargar datos de prueba: ${json.error}`, 'error');
    }
  } catch (err) {
    addLog(`Error de conexión al cargar pruebas: ${err.message}`, 'error');
  }
}

async function uploadContactsFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    addLog(`Subiendo y procesando archivo: ${file.name}...`, 'info');
    const res = await fetch('/api/upload-contacts', { method: 'POST', body: formData });
    const json = await res.json();
    if (json.success) {
      applyLoadedContacts(json.data, json.filename);
      addLog(`✅ Archivo cargado con éxito. Total contactos: ${json.data.total}`, 'success');
    } else {
      alert(`Error al procesar archivo: ${json.error}`);
      addLog(`Error en archivo: ${json.error}`, 'error');
    }
  } catch (err) {
    alert(`Error de red: ${err.message}`);
  }
}

async function uploadMediaFile(file) {
  const formData = new FormData();
  formData.append('image', file);
  try {
    addLog(`Subiendo imagen: ${file.name}...`, 'info');
    const res = await fetch('/api/upload-media', { method: 'POST', body: formData });
    const json = await res.json();
    if (json.success) {
      state.selectedMedia = {
        filePath: json.filePath,
        url: json.url,
        filename: json.filename
      };
      renderMediaPreview();
      addLog('✅ Imagen adjunta lista para enviar.', 'success');
    }
  } catch (err) {
    alert(`Error al subir imagen: ${err.message}`);
  }
}

function applyLoadedContacts(data, filename) {
  state.contacts = data.contacts;
  state.availableTags = data.availableTags || [];
  state.selectedPreviewIndex = 0;

  // Actualizar resumen
  el.contactsSummaryBox.classList.remove('hidden');
  el.contactsFileName.textContent = `Archivo: ${filename} (${data.total} contactos)`;
  el.validContactsBadge.textContent = `${data.validCount} Válidos`;

  if (data.invalidCount > 0) {
    el.invalidContactsBadge.textContent = `${data.invalidCount} Con Error`;
    el.invalidContactsBadge.classList.remove('hidden');
  } else {
    el.invalidContactsBadge.classList.add('hidden');
  }

  // Renderizar pills de variables
  el.tagsContainer.innerHTML = '';
  state.availableTags.forEach((tag) => {
    const btn = document.createElement('button');
    btn.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 transition shadow-xs';
    btn.textContent = `{${tag}}`;
    btn.title = `Haz clic para insertar {${tag}}`;
    btn.addEventListener('click', () => insertTag(tag));
    el.tagsContainer.appendChild(btn);
  });

  renderContactsTable();
  updatePhonePreview();
}

function renderMediaPreview() {
  if (!state.selectedMedia) return;
  el.mediaThumb.src = state.selectedMedia.url;
  el.mediaName.textContent = state.selectedMedia.filename;
  el.mediaPreviewBox.classList.remove('hidden');

  // En el simulador
  el.phonePreviewImg.src = state.selectedMedia.url;
  el.phonePreviewMedia.classList.remove('hidden');
}

function insertTag(tag) {
  const textarea = el.messageText;
  const tagText = `{${tag}}`;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + tagText + text.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + tagText.length;
  textarea.focus();

  updateCharCounter();
  updatePhonePreview();
}

function updateCharCounter() {
  el.charCounter.textContent = `${el.messageText.value.length} caracteres`;
}

// ==========================================
// SIMULADOR DE TELÉFONO WHATSAPP
// ==========================================
function updatePhonePreview() {
  if (state.contacts.length === 0) {
    el.previewContactName.textContent = 'Sin contactos cargados';
    el.phonePreviewText.textContent = el.messageText.value;
    return;
  }

  const contact = state.contacts[state.selectedPreviewIndex] || state.contacts[0];
  el.previewContactName.textContent = `Para: ${contact.name}`;

  // Renderizar plantilla
  let rendered = el.messageText.value;
  const vars = { nombre: contact.name, ...contact.variables };
  Object.keys(vars).forEach((k) => {
    const regex = new RegExp(`\\{${k}\\}`, 'gi');
    rendered = rendered.replace(regex, vars[k] || '');
  });

  el.phonePreviewText.textContent = rendered;
}

// ==========================================
// TABLA DE CONTACTOS
// ==========================================
function renderContactsTable() {
  el.contactsTableBody.innerHTML = '';
  el.tableCount.textContent = `${state.contacts.length} contactos`;

  if (state.contacts.length === 0) {
    el.contactsTableBody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">No hay contactos cargados.</td></tr>`;
    return;
  }

  state.contacts.forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.id = `contact-row-${c.id}`;
    tr.className = 'hover:bg-slate-50 transition cursor-pointer';

    // Status chip
    let statusChip = '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">Pendiente</span>';
    if (c.status === 'sent') {
      statusChip = '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">✓ Enviado</span>';
    } else if (c.status === 'failed') {
      statusChip = '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">✗ Fallido</span>';
    } else if (c.status === 'skipped') {
      statusChip = '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">⚠ Omitido</span>';
    }

    tr.innerHTML = `
      <td class="py-2.5 px-3 font-mono text-slate-400">${idx + 1}</td>
      <td class="py-2.5 px-3 font-semibold text-slate-800">${c.name}</td>
      <td class="py-2.5 px-3 font-mono text-slate-600 ${c.isValidPhone ? '' : 'text-rose-600 font-bold'}">${c.displayPhone}</td>
      <td class="py-2.5 px-3 text-slate-700">${c.variables.alumno || '-'}</td>
      <td class="py-2.5 px-3 text-slate-700">${c.variables.materia || '-'}</td>
      <td class="py-2.5 px-3" id="chip-status-${c.id}">${statusChip}</td>
      <td class="py-2.5 px-3 text-right">
        <button class="text-[10px] font-bold text-sky-600 hover:text-sky-800" onclick="selectPreviewContact(${idx})">Ver Preview</button>
      </td>
    `;
    el.contactsTableBody.appendChild(tr);
  });
}

window.selectPreviewContact = function(index) {
  state.selectedPreviewIndex = index;
  updatePhonePreview();
};

// ==========================================
// MODOS DE OPERACIÓN
// ==========================================
function setMode(newMode) {
  state.mode = newMode;
  if (newMode === 'simulation') {
    el.modeBtnSimulation.className = 'py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 bg-white text-sky-700 shadow-sm';
    el.modeBtnLive.className = 'py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900';
    el.modeNotice.className = 'p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900';
    el.modeNotice.innerHTML = '💡 <b>Modo Simulación Activo:</b> Permite probar la plantilla, el reemplazo de nombres y el flujo completo sin enviar ningún mensaje real ni molestar a los apoderados.';
    el.startBtnLabel.textContent = 'Iniciar Simulación de Envío';
  } else {
    el.modeBtnLive.className = 'py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-sm';
    el.modeBtnSimulation.className = 'py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900';
    el.modeNotice.className = 'p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900';
    el.modeNotice.innerHTML = '⚠️ <b>Modo Real (WhatsApp Web):</b> Los mensajes e imágenes se despacharán al WhatsApp de los apoderados reales desde la cuenta de Ximena con pausas de seguridad.';
    el.startBtnLabel.textContent = '🚀 Iniciar Envío Real (WhatsApp)';
  }
}

// ==========================================
// CONTROL DEL MOTOR DE ENVÍO
// ==========================================
async function handleStartButtonClick() {
  if (state.contacts.length === 0) {
    alert('Primero debes cargar contactos o presionar "Cargar Datos de Prueba".');
    return;
  }

  if (!el.messageText.value.trim()) {
    alert('Por favor redacta un mensaje antes de iniciar.');
    return;
  }

  if (state.mode === 'live' && state.whatsappStatus !== 'READY') {
    alert('WhatsApp no está conectado. Haz clic en "Vincular WhatsApp" para escanear el QR, o usa el "Modo Simulación" para probar sin conexión.');
    el.btnOpenQrModal.click();
    return;
  }

  const payload = {
    contacts: state.contacts,
    messageTemplate: el.messageText.value,
    imagePath: state.selectedMedia ? state.selectedMedia.filePath : null,
    mode: state.mode,
    minDelaySeconds: parseInt(el.minDelay.value, 10) || 4,
    maxDelaySeconds: parseInt(el.maxDelay.value, 10) || 8,
    batchSize: parseInt(el.batchSize.value, 10) || 25,
    batchPauseSeconds: parseInt(el.batchPause.value, 10) || 30
  };

  try {
    const res = await fetch('/api/sender/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) {
      alert(`No se pudo iniciar: ${json.error}`);
    }
  } catch (err) {
    alert(`Error al iniciar envío: ${err.message}`);
  }
}

function updateEngineUI(engineState) {
  state.engineState = engineState;

  if (engineState === 'RUNNING') {
    el.btnStart.disabled = true;
    el.btnStart.classList.add('opacity-50');
    el.btnPause.disabled = false;
    el.btnPause.textContent = '⏸️ Pausar';
    el.btnStop.disabled = false;
    el.progressStatusLabel.textContent = 'Enviando mensajes...';
  } else if (engineState === 'PAUSED') {
    el.btnStart.disabled = true;
    el.btnPause.disabled = false;
    el.btnPause.textContent = '▶️ Reanudar';
    el.btnStop.disabled = false;
    el.progressStatusLabel.textContent = 'Campaña en Pausa';
  } else {
    // IDLE
    el.btnStart.disabled = false;
    el.btnStart.classList.remove('opacity-50');
    el.btnPause.disabled = true;
    el.btnPause.textContent = '⏸️';
    el.btnStop.disabled = true;
    el.progressStatusLabel.textContent = 'Listo para iniciar';
  }
}

// ==========================================
// SOCKET.IO EVENTOS EN TIEMPO REAL
// ==========================================
socket.on('whatsapp_status', (data) => {
  state.whatsappStatus = data.status;

  if (data.status === 'READY') {
    el.waBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
    el.waBadge.querySelector('span').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
    el.waStatusText.textContent = `Conectado: ${data.userProfile?.pushname || 'Ximena Kumon'}`;

    // Modal
    el.qrLoading.classList.add('hidden');
    el.qrImage.classList.add('hidden');
    el.qrConnectedCard.classList.remove('hidden');
    el.qrUserName.textContent = `Sesión activa como: ${data.userProfile?.pushname || 'Ximena'}`;
    el.btnModalDisconnect.classList.remove('hidden');
  } else if (data.status === 'QR_READY' && data.qrCode) {
    el.waBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200';
    el.waBadge.querySelector('span').className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
    el.waStatusText.textContent = 'Esperando escaneo de QR...';

    // Modal
    el.qrLoading.classList.add('hidden');
    el.qrConnectedCard.classList.add('hidden');
    el.qrImage.src = data.qrCode;
    el.qrImage.classList.remove('hidden');
    el.btnModalDisconnect.classList.add('hidden');
  } else if (data.status === 'INITIALIZING') {
    el.waStatusText.textContent = 'Iniciando WhatsApp...';
    el.qrLoading.classList.remove('hidden');
    el.qrImage.classList.add('hidden');
    el.qrConnectedCard.classList.add('hidden');
  } else {
    // DISCONNECTED
    el.waBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200';
    el.waBadge.querySelector('span').className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
    el.waStatusText.textContent = 'WhatsApp Desconectado';
    el.btnModalDisconnect.classList.add('hidden');
  }
});

socket.on('sender_status', (data) => {
  updateEngineUI(data.state);
  if (data.stats) updateStatsUI(data.stats);
});

socket.on('sender_progress', (data) => {
  el.progressBar.style.width = `${data.percent}%`;
  el.progressPercent.textContent = `${data.percent}%`;
  updateStatsUI(data.stats);

  // Actualizar fila del contacto en la tabla
  const chip = document.getElementById(`chip-status-${data.currentContact.id}`);
  if (chip) {
    if (data.currentContact.status === 'sent') {
      chip.innerHTML = '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">✓ Enviado</span>';
    } else if (data.currentContact.status === 'failed') {
      chip.innerHTML = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700" title="${data.currentContact.error || ''}">✗ Fallido</span>`;
    } else if (data.currentContact.status === 'skipped') {
      chip.innerHTML = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700" title="${data.currentContact.error || ''}">⚠ Omitido</span>`;
    }
  }

  // Actualizar vista previa en el teléfono con el contacto actual en envío
  el.previewContactName.textContent = `Para: ${data.currentContact.name}`;
  el.phonePreviewText.textContent = data.currentContact.previewText;
});

socket.on('sender_log', (entry) => {
  addLog(entry.message, entry.type);
});

socket.on('sender_completed', (data) => {
  addLog(`🎉 Proceso completado en ${data.durationSeconds}s.`, 'success');
  alert(`Envío completado:\n• Enviados: ${data.stats.sent}\n• Fallidos: ${data.stats.failed}\n• Omitidos: ${data.stats.skipped}`);
});

function updateStatsUI(stats) {
  el.statSent.textContent = stats.sent || 0;
  el.statFailed.textContent = stats.failed || 0;
  el.statSkipped.textContent = stats.skipped || 0;
  el.statTotal.textContent = stats.total || 0;
}

function addLog(message, type = 'info') {
  const line = document.createElement('div');
  const now = new Date().toLocaleTimeString('es-CL');
  let color = 'text-slate-300';
  if (type === 'success') color = 'text-emerald-400 font-semibold';
  if (type === 'error') color = 'text-rose-400 font-bold';
  if (type === 'warning') color = 'text-amber-300';

  line.className = color;
  line.textContent = `[${now}] ${message}`;
  el.logConsole.appendChild(line);
  el.logConsole.scrollTop = el.logConsole.scrollHeight;
}

// Iniciar al cargar DOM
document.addEventListener('DOMContentLoaded', init);

