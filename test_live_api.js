// Test de integración en vivo contra el servidor Express en ejecución (localhost:3000)
const http = require('http');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function runLiveTest() {
  console.log('==================================================');
  console.log('🧪 Ejecutando Pruebas de Integración en Vivo (API)');
  console.log('==================================================\n');

  // 1. Probar endpoint de estado del servidor
  console.log('[Paso 1/4] Verificando estado inicial del servidor...');
  const initialStatus = await getJson('/api/status');
  console.log(`✓ Estado WhatsApp: ${initialStatus.whatsapp.status}`);
  console.log(`✓ Estado Motor de Envíos: ${initialStatus.sender.state}`);

  // 2. Obtener contactos de prueba
  console.log('\n[Paso 2/4] Solicitando contactos de prueba a la API...');
  const contactsRes = await getJson('/api/test-contacts');
  if (!contactsRes.success) throw new Error('Fallo al obtener contactos de prueba');
  console.log(`✓ Contactos obtenidos: ${contactsRes.data.total}`);
  contactsRes.data.contacts.forEach((c) => {
    console.log(`   - ${c.name} (${c.displayPhone}) -> Alumno: ${c.variables.alumno} (${c.variables.materia})`);
  });

  // 3. Disparar campaña en modo simulación
  console.log('\n[Paso 3/4] Enviando orden de campaña (POST /api/sender/start)...');
  const campaignPayload = {
    contacts: contactsRes.data.contacts,
    messageTemplate: '¡Hola {nombre}! En Kumon Los Presidentes felicitamos a {alumno} por su avance en {materia}.',
    imagePath: 'data/imagen_prueba.png',
    mode: 'simulation',
    minDelaySeconds: 1,
    maxDelaySeconds: 2
  };

  const startRes = await postJson('/api/sender/start', campaignPayload);
  if (!startRes.success) throw new Error(`Fallo al iniciar campaña: ${JSON.stringify(startRes)}`);
  console.log('✓ Campaña iniciada con éxito en el servidor.');

  // 4. Monitorear progreso hasta finalizar
  console.log('\n[Paso 4/4] Monitoreando progreso en tiempo real...');
  let completed = false;
  let attempts = 0;

  while (!completed && attempts < 30) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await getJson('/api/status');
    const { sent, total, failed, skipped } = status.sender.stats;
    console.log(`   [Estado: ${status.sender.state}] -> Enviados: ${sent}/${total} | Fallidos: ${failed}`);

    if (status.sender.state === 'IDLE' && sent > 0) {
      completed = true;
      console.log('\n==================================================');
      console.log('🎉 RESULTADO FINAL: TODAS LAS PRUEBAS PASARON');
      console.log(`✓ Total procesados: ${total}`);
      console.log(`✓ Enviados simulados: ${sent}`);
      console.log(`✓ Fallidos: ${failed}`);
      console.log(`✓ Omitidos: ${skipped}`);
      console.log('==================================================');
    }
    attempts++;
  }

  if (!completed) {
    throw new Error('Tiempo de espera agotado sin finalizar la campaña.');
  }
}

runLiveTest().catch((err) => {
  console.error('❌ Error en las pruebas:', err.message);
  process.exit(1);
});
