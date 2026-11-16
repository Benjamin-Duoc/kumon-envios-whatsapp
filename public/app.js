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
  qrErrorCard: document.getElementById('qr-error-card'),
  qrErrorMsg: document.getElementById('qr-error-msg'),
  qrUserName: document.getElementById('qr-user-name'),
  btnModalReconnect: document.getElementById('btn-modal-reconnect'),
  btnModalDisconnect: document.getElementById('btn-modal-disconnect'),

  btnLoadTestData: document.getElementById('btn-load-test-data'),
  btnAddManualContact: document.getElementById('btn-add-manual-contact'),
  btnImportWaContacts: document.getElementById('btn-import-wa-contacts'),
  extractModal: document.getElementById('extract-modal'),
  btnCloseExtractModal: document.getElementById('btn-close-extract-modal'),
  btnCancelExtract: document.getElementById('btn-cancel-extract'),
  extractCustomLimit: document.getElementById('extract-custom-limit'),
  extractSavedOnly: document.getElementById('extract-saved-only'),
  btnDoExtractTable: document.getElementById('btn-do-extract-table'),
  btnDoExtractExcel: document.getElementById('btn-do-extract-excel'),
  extractPresetBtns: document.querySelectorAll('.extract-preset-btn'),
  manualContactModal: document.getElementById('manual-contact-modal'),
  btnCloseManualModal: document.getElementById('btn-close-manual-modal'),
  btnCancelManualContact: document.getElementById('btn-cancel-manual-contact'),
  btnSaveManualContact: document.getElementById('btn-save-manual-contact'),
  manualName: document.getElementById('manual-name'),
  manualPhone: document.getElementById('manual-phone'),
  manualAlumno: document.getElementById('manual-alumno'),
  manualMateria: document.getElementById('manual-materia'),
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
  tableCount: document.getElementById('table-count'),
  btnClearAllContacts: document.getElementById('btn-clear-all-contacts')
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

  // Modal Contacto Manual
  el.btnAddManualContact.addEventListener('click', () => {
    el.manualName.value = '';
    el.manualPhone.value = '';
    el.manualAlumno.value = '';
    el.manualContactModal.classList.remove('hidden');
    el.manualName.focus();
  });

  el.btnCloseManualModal.addEventListener('click', () => el.manualContactModal.classList.add('hidden'));
  el.btnCancelManualContact.addEventListener('click', () => el.manualContactModal.classList.add('hidden'));

  el.btnSaveManualContact.addEventListener('click', handleSaveManualContact);

  // Extraer Contactos de WhatsApp (Modal con selector de cantidad)
  el.btnImportWaContacts.addEventListener('click', () => {
    if (state.whatsappStatus !== 'READY') {
      alert('Debes conectar WhatsApp primero mediante el botón "Vincular WhatsApp" para poder extraer tus contactos.');
      el.btnOpenQrModal.click();
      return;
    }
    el.extractModal.classList.remove('hidden');
  });

  el.btnCloseExtractModal.addEventListener('click', () => el.extractModal.classList.add('hidden'));
  el.btnCancelExtract.addEventListener('click', () => el.extractModal.classList.add('hidden'));

  // Botones de cantidad predeterminada (25, 50, 100, 250, Todos)
  el.extractPresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.extractPresetBtns.forEach((b) => {
        b.className = 'extract-preset-btn py-2 px-2 bg-slate-100 hover:bg-kumon-50 hover:text-kumon-700 text-slate-700 rounded-xl font-bold border border-slate-200 text-center transition';
      });
      btn.className = 'extract-preset-btn py-2 px-2 bg-kumon-500 text-white rounded-xl font-bold border border-kumon-500 text-center transition shadow-xs';
      const amount = btn.getAttribute('data-amount');
      el.extractCustomLimit.value = amount === 'all' ? '3000' : amount;
      el.extractCustomLimit.setAttribute('data-selected-amount', amount);
    });
  });

  el.btnDoExtractTable.addEventListener('click', () => doExtractContacts('table'));
  el.btnDoExtractExcel.addEventListener('click', () => doExtractContacts('excel'));

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

  if (el.btnClearAllContacts) {
    el.btnClearAllContacts.addEventListener('click', () => {
      if (state.contacts.length === 0) return;
      if (confirm(`¿Vaciar toda la lista actual (${state.contacts.length} contactos)?`)) {
        state.contacts = [];
        state.selectedPreviewIndex = 0;
        updateContactsCounters();
        renderContactsTable();
        updatePhonePreview();
        el.contactsSummaryBox.classList.add('hidden');
        addLog('🗑️ Lista de contactos vaciada.', 'warning');
      }
    });
  }
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

function handleSaveManualContact() {
  const name = el.manualName.value.trim();
  const phone = el.manualPhone.value.trim();
  const alumno = el.manualAlumno.value.trim() || name;
  const materia = el.manualMateria.value.trim() || 'Matemáticas y Lenguaje';

  if (!name || !phone) {
    alert('Por favor ingresa al menos el Nombre y el Teléfono.');
    return;
  }

  // Normalización básica rápida para Chile
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) clean = clean.substring(1);
  if (clean.length === 9 && clean.startsWith('9')) clean = '56' + clean;
  else if (clean.length === 8) clean = '569' + clean;

  const isValid = clean.length >= 10 && clean.length <= 15;
  const newContact = {
    id: state.contacts.length + 1,
    name,
    rawPhone: phone,
    phone: clean,
    jid: `${clean}@c.us`,
    displayPhone: `+${clean}`,
    isValidPhone: isValid,
    invalidReason: isValid ? null : 'Número inválido',
    variables: {
      nombre: name,
      telefono: `+${clean}`,
      alumno,
      materia
    },
    status: 'pending'
  };

  state.contacts.push(newContact);
  ['nombre', 'telefono', 'alumno', 'materia'].forEach(t => {
    if (!state.availableTags.includes(t)) state.availableTags.push(t);
  });

  applyLoadedContacts({
    contacts: state.contacts,
    total: state.contacts.length,
    validCount: state.contacts.filter(c => c.isValidPhone).length,
    invalidCount: state.contacts.filter(c => !c.isValidPhone).length,
    availableTags: state.availableTags
  }, 'Contacto agregado manualmente');

  el.manualContactModal.classList.add('hidden');
  addLog(`➕ Contacto agregado: ${name} (+${clean})`, 'success');
}

async function doExtractContacts(destination = 'table') {
  const selectedBtn = document.querySelector('.extract-preset-btn.bg-sky-600');
  let amount = selectedBtn ? selectedBtn.getAttribute('data-amount') : '50';
  if (el.extractCustomLimit.value && amount !== 'all') {
    amount = el.extractCustomLimit.value;
  }
  const savedOnly = el.extractSavedOnly.checked;
  const query = `limit=${encodeURIComponent(amount)}&savedOnly=${savedOnly}`;

  el.extractModal.classList.add('hidden');

  if (destination === 'excel') {
    addLog(`📥 Descargando archivo Excel con contactos de WhatsApp (${amount === 'all' ? 'Todos' : amount} contactos)...`, 'info');
    window.location.href = `/api/whatsapp/download-excel?${query}`;
    return;
  }

  try {
    addLog(`📥 Extrayendo ${amount === 'all' ? 'todos los' : amount} contactos de WhatsApp Web...`, 'info');
    const res = await fetch(`/api/whatsapp/extract-contacts?${query}`);
    const json = await res.json();
    if (json.success && json.data) {
      applyLoadedContacts(json.data, `WhatsApp (${json.count} contactos extraídos)`);
      addLog(`✅ ¡Éxito! Se extrajeron ${json.count} contactos directamente de tu WhatsApp.`, 'success');
      alert(`¡Se extrajeron ${json.count} contactos de tu WhatsApp y ya están listos en la tabla!`);
    } else {
      alert(`Error al extraer contactos: ${json.error}`);
      addLog(`Error: ${json.error}`, 'error');
    }
  } catch (err) {
    alert(`Error de red: ${err.message}`);
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
    btn.className = 'btn-bounce px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-kumon-50 text-kumon-800 border border-kumon-200 transition shadow-2xs cursor-pointer';
    btn.textContent = `{${tag}}`;
    btn.title = `Haz clic para insertar {${tag}} en el mensaje`;
    btn.addEventListener('click', () => insertTag(tag));
    el.tagsContainer.appendChild(btn);
  });

  renderContactsTable();
  updateContactsCounters();
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
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-kumon-100 text-kumon-800 ring-kumon-200',
  'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'bg-amber-100 text-amber-800 ring-amber-200',
  'bg-purple-100 text-purple-800 ring-purple-200',
  'bg-rose-100 text-rose-800 ring-rose-200',
  'bg-teal-100 text-teal-800 ring-teal-200',
  'bg-indigo-100 text-indigo-800 ring-indigo-200'
];

function renderContactsTable() {
  el.contactsTableBody.innerHTML = '';
  el.tableCount.textContent = `${state.contacts.length} contactos`;

  if (state.contacts.length === 0) {
    el.contactsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="text-3xl">👥</span>
            <p class="font-semibold text-slate-600">No hay contactos cargados en la lista</p>
            <p class="text-xs text-slate-400">Haz clic en "⚡ Probar Ejemplo" o "📥 Extraer de WhatsApp" arriba.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  state.contacts.forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.id = `contact-row-${c.id}`;
    tr.className = 'hover:bg-slate-50/80 transition cursor-pointer group';

    // Status chip
    let statusChip = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">⏳ Pendiente</span>';
    if (c.status === 'sent') {
      statusChip = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">✓ Enviado</span>';
    } else if (c.status === 'failed') {
      statusChip = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800" title="' + (c.error || '') + '">✗ Fallido</span>';
    } else if (c.status === 'skipped') {
      statusChip = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800" title="' + (c.error || '') + '">⚠ Omitido</span>';
    }

    const initials = getInitials(c.name);
    const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];

    tr.innerHTML = `
      <td class="py-3 px-3.5 font-mono text-slate-400 text-xs">${idx + 1}</td>
      <td class="py-3 px-3.5">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold ring-1 ${colorClass} shrink-0">
            ${initials}
          </div>
          <div>
            <p class="font-bold text-slate-900 leading-tight">${c.name}</p>
          </div>
        </div>
      </td>
      <td class="py-3 px-3.5 font-mono text-xs ${c.isValidPhone ? 'text-slate-600' : 'text-rose-600 font-bold'}">
        ${c.displayPhone}
      </td>
      <td class="py-3 px-3.5 text-slate-700 font-medium">
        ${c.variables.alumno || '<span class="text-slate-400 italic">No especificado</span>'}
      </td>
      <td class="py-3 px-3.5">
        <span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          ${c.variables.materia || 'Kumon'}
        </span>
      </td>
      <td class="py-3 px-3.5 text-center" id="chip-status-${c.id}">${statusChip}</td>
      <td class="py-3 px-3.5 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button class="btn-bounce text-[11px] font-bold text-kumon-700 hover:text-kumon-900 bg-kumon-50 hover:bg-kumon-100 border border-kumon-200 px-2.5 py-1 rounded-lg transition" onclick="selectPreviewContact(${idx})">👁️ Ver Preview</button>
          <button class="btn-bounce text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg transition flex items-center gap-1" title="Eliminar de la lista de envío" onclick="deleteContact(${c.id})">
            <span>🗑️</span>
          </button>
        </div>
      </td>
    `;
    el.contactsTableBody.appendChild(tr);
  });
}

function updateContactsCounters() {
  const total = state.contacts.length;
  const valid = state.contacts.filter(c => c.isValidPhone).length;
  const invalid = total - valid;

  el.tableCount.textContent = `${total} contactos`;
  el.validContactsBadge.textContent = `${valid} Válidos`;

  if (invalid > 0) {
    el.invalidContactsBadge.textContent = `${invalid} Con Error`;
    el.invalidContactsBadge.classList.remove('hidden');
  } else {
    el.invalidContactsBadge.classList.add('hidden');
  }

  if (total > 0) {
    if (el.btnClearAllContacts) el.btnClearAllContacts.classList.remove('hidden');
  } else {
    if (el.btnClearAllContacts) el.btnClearAllContacts.classList.add('hidden');
  }
}

window.deleteContact = function(id) {
  const contact = state.contacts.find(c => c.id === id);
  if (!contact) return;

  if (confirm(`¿Eliminar a "${contact.name}" (${contact.displayPhone}) de la lista de envío?`)) {
    state.contacts = state.contacts.filter(c => c.id !== id);
    if (state.selectedPreviewIndex >= state.contacts.length) {
      state.selectedPreviewIndex = Math.max(0, state.contacts.length - 1);
    }
    updateContactsCounters();
    renderContactsTable();
    updatePhonePreview();
    addLog(`🗑️ Contacto eliminado: ${contact.name}`, 'warning');
  }
};

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
    el.modeBtnSimulation.className = 'py-3 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-white text-kumon-700 shadow-sm border border-slate-200/60';
    el.modeBtnLive.className = 'py-3 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900';
    el.modeNotice.className = 'p-3.5 bg-kumon-50 border border-kumon-200 rounded-2xl text-xs text-kumon-900 flex items-start gap-2.5';
    el.modeNotice.innerHTML = '<span class="text-lg leading-none">💡</span><div><p class="font-bold">Modo Práctica Activo (100% Seguro):</p><p class="mt-0.5 text-kumon-800">Puedes probar el mensaje, ver cómo se reemplazan los nombres de los alumnos y comprobar todo el proceso sin enviar nada a los teléfonos reales.</p></div>';
    el.btnStart.className = 'btn-bounce flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base bg-kumon-500 hover:bg-kumon-600 active:bg-kumon-700 text-white shadow-lg shadow-kumon-200 transition-all flex items-center justify-center gap-2.5';
    el.startBtnLabel.textContent = 'Iniciar Simulación de Prueba';
  } else {
    el.modeBtnLive.className = 'py-3 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-sm';
    el.modeBtnSimulation.className = 'py-3 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900';
    el.modeNotice.className = 'p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5';
    el.modeNotice.innerHTML = '<span class="text-lg leading-none">⚠️</span><div><p class="font-bold">Modo Real Oficial (WhatsApp):</p><p class="mt-0.5 text-amber-800">Los mensajes e imágenes se enviarán directamente al WhatsApp de cada apoderado desde tu cuenta con intervalos de seguridad.</p></div>';
    el.btnStart.className = 'btn-bounce flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2.5';
    el.startBtnLabel.textContent = '🚀 Iniciar Envío a Familias (WhatsApp)';
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
    el.waBadge.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs';
    el.waBadge.querySelector('span').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
    el.waStatusText.textContent = `🟢 WhatsApp Conectado (${data.userProfile?.pushname || 'Ximena'})`;

    // Modal
    el.qrLoading.classList.add('hidden');
    el.qrImage.classList.add('hidden');
    el.qrErrorCard.classList.add('hidden');
    el.qrConnectedCard.classList.remove('hidden');
    el.qrUserName.textContent = `Sesión activa como: ${data.userProfile?.pushname || 'Orientadora Ximena'}`;
    el.btnModalDisconnect.classList.remove('hidden');
  } else if (data.status === 'QR_READY' && data.qrCode) {
    el.waBadge.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs';
    el.waBadge.querySelector('span').className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
    el.waStatusText.textContent = '🟡 Escanear Código QR';

    // Modal
    el.qrLoading.classList.add('hidden');
    el.qrConnectedCard.classList.add('hidden');
    el.qrErrorCard.classList.add('hidden');
    el.qrImage.src = data.qrCode;
    el.qrImage.classList.remove('hidden');
    el.btnModalDisconnect.classList.add('hidden');
  } else if (data.status === 'INITIALIZING') {
    el.waBadge.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs';
    el.waBadge.querySelector('span').className = 'w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping';
    el.waStatusText.textContent = 'Iniciando WhatsApp...';
    el.qrLoading.classList.remove('hidden');
    el.qrImage.classList.add('hidden');
    el.qrErrorCard.classList.add('hidden');
    el.qrConnectedCard.classList.add('hidden');
  } else {
    // DISCONNECTED
    el.waBadge.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs';
    el.waBadge.querySelector('span').className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
    el.waStatusText.textContent = '⚪ WhatsApp Desconectado';
    el.btnModalDisconnect.classList.add('hidden');

    if (data.error) {
      el.qrLoading.classList.add('hidden');
      el.qrImage.classList.add('hidden');
      el.qrConnectedCard.classList.add('hidden');
      el.qrErrorCard.classList.remove('hidden');
      el.qrErrorMsg.textContent = data.error;
    }
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

