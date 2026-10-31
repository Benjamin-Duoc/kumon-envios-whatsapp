const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * Normaliza números de teléfono al formato internacional requerido por WhatsApp
 * Ejemplos en Chile:
 *  - "+56911223344" -> "56911223344@c.us"
 *  - "911223344"    -> "56911223344@c.us"
 *  - "11223344"     -> "56911223344@c.us"
 */
function normalizePhoneNumber(rawPhone, defaultCountryCode = '56') {
  if (!rawPhone) return { isValid: false, formatted: '', cleanNumber: '', reason: 'Número vacío' };

  // Eliminar espacios, guiones, paréntesis y signos
  let clean = String(rawPhone).replace(/[^\d+]/g, '');

  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  }

  // Lógica específica para Chile (código 56)
  if (defaultCountryCode === '56') {
    // Si viene como 9XXXXXXXX (9 dígitos móviles)
    if (clean.length === 9 && clean.startsWith('9')) {
      clean = '56' + clean;
    }
    // Si viene como XXXXXXXX (8 dígitos)
    else if (clean.length === 8) {
      clean = '569' + clean;
    }
    // Si viene como 569XXXXXXXX (11 dígitos)
    else if (clean.length === 11 && clean.startsWith('569')) {
      // Ya tiene formato correcto
    }
  }

  // Validación básica de longitud (mínimo 10 dígitos para móvil internacional)
  if (clean.length < 10 || clean.length > 15) {
    return {
      isValid: false,
      formatted: clean,
      cleanNumber: clean,
      reason: `Longitud de número inválida (${clean.length} dígitos)`
    };
  }

  return {
    isValid: true,
    formatted: `${clean}@c.us`,
    cleanNumber: clean,
    display: `+${clean}`
  };
}

/**
 * Lee un archivo CSV o Excel y devuelve una lista de contactos con variables normalizadas
 */
function parseContactsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo no existe: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('El archivo está vacío o no tiene registros válidos.');
  }

  const contacts = [];
  const availableTags = new Set();

  rawRows.forEach((row, index) => {
    // Buscar la columna de teléfono con nombres comunes
    const keys = Object.keys(row);
    let phoneKey = keys.find(k => /^(telefono|tel|celular|whatsapp|phone|fono|movil)$/i.test(k.trim()));
    let nameKey = keys.find(k => /^(nombre|name|apoderado|contacto|cliente)$/i.test(k.trim()));

    // Si no se encuentra explícita, buscar una clave que contenga 'tel' o 'cel'
    if (!phoneKey) {
      phoneKey = keys.find(k => /tel|cel|phone|fono/i.test(k));
    }
    if (!nameKey) {
      nameKey = keys.find(k => /nom|name/i.test(k)) || keys[0];
    }

    const rawPhone = phoneKey ? row[phoneKey] : '';
    const phoneNorm = normalizePhoneNumber(rawPhone);

    // Mapear todas las columnas para que estén disponibles como variables {columna}
    const variables = {};
    keys.forEach(k => {
      const cleanKey = k.trim().toLowerCase();
      variables[cleanKey] = String(row[k] || '').trim();
      availableTags.add(cleanKey);
    });

    contacts.push({
      id: index + 1,
      name: nameKey && row[nameKey] ? String(row[nameKey]).trim() : `Contacto ${index + 1}`,
      rawPhone: String(rawPhone || '').trim(),
      phone: phoneNorm.cleanNumber,
      jid: phoneNorm.formatted,
      displayPhone: phoneNorm.display || rawPhone,
      isValidPhone: phoneNorm.isValid,
      invalidReason: phoneNorm.reason || null,
      variables,
      status: 'pending' // pending, sent, error, skipped
    });
  });

  return {
    total: contacts.length,
    validCount: contacts.filter(c => c.isValidPhone).length,
    invalidCount: contacts.filter(c => !c.isValidPhone).length,
    availableTags: Array.from(availableTags),
    contacts
  };
}

/**
 * Carga los datos de prueba predeterminados
 */
function loadTestContacts() {
  const testXlsxPath = path.join(__dirname, '..', 'data', 'contactos_prueba.xlsx');
  if (fs.existsSync(testXlsxPath)) {
    return parseContactsFile(testXlsxPath);
  }
  const testCsvPath = path.join(__dirname, '..', 'data', 'contactos_prueba.csv');
  return parseContactsFile(testCsvPath);
}

module.exports = {
  normalizePhoneNumber,
  parseContactsFile,
  loadTestContacts
};
