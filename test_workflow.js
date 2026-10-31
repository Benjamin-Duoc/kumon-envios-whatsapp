// Script de prueba integral del flujo de envío
const http = require('http');

async function testWorkflow() {
  console.log('--- Iniciando prueba del flujo del sistema ---');

  // Importar directamente los módulos core para verificar la lógica
  const { parseContactsFile, loadTestContacts } = require('./src/contactsParser');
  const SenderEngine = require('./src/senderEngine');

  // 1. Probar carga de contactos
  console.log('\n[1/3] Probando carga de contactos de prueba...');
  const testData = loadTestContacts();
  console.log(`✓ Total contactos: ${testData.total}`);
  console.log(`✓ Contactos válidos: ${testData.validCount}`);
  console.log(`✓ Columnas/Tags disponibles: ${testData.availableTags.join(', ')}`);

  if (testData.total !== 5 || testData.validCount !== 5) {
    throw new Error('Fallo en la validación de contactos de prueba.');
  }

  // 2. Probar reemplazo de variables en plantilla
  console.log('\n[2/3] Probando motor de plantillas y variables...');
  const mockWhatsapp = { isReady: () => false };
  const mockIo = {
    emit: (event, data) => {
      if (event === 'sender_progress') {
        console.log(`   -> Progreso: ${data.percent}% | Contacto: ${data.currentContact.name} | Estado: ${data.currentContact.status}`);
      }
    }
  };

  const sender = new SenderEngine(mockIo, mockWhatsapp);
  const sampleTemplate = 'Hola {nombre}, te recordamos que {alumno} tiene clase de {materia}.';
  const rendered = sender.renderTemplate(sampleTemplate, testData.contacts[0].variables);
  console.log(`✓ Plantilla renderizada para ${testData.contacts[0].name}:`);
  console.log(`   "${rendered}"`);

  // 3. Probar ejecución en Modo Simulación
  console.log('\n[3/3] Ejecutando campaña completa en Modo Simulación...');
  await sender.start({
    contacts: testData.contacts,
    messageTemplate: sampleTemplate,
    mode: 'simulation',
    minDelaySeconds: 1,
    maxDelaySeconds: 2
  });

  // Esperar a que la cola termine
  while (sender.state === 'RUNNING') {
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n--- Resumen de la prueba ---');
  console.log(`✓ Total: ${sender.stats.total}`);
  console.log(`✓ Enviados con éxito: ${sender.stats.sent}`);
  console.log(`✓ Fallidos: ${sender.stats.failed}`);
  console.log(`✓ Omitidos: ${sender.stats.skipped}`);

  if (sender.stats.sent === 5) {
    console.log('\n🎉 ¡PRUEBA EXITOSA! El software procesó los 5 contactos de prueba perfectamente.');
  } else {
    throw new Error('No todos los contactos fueron procesados correctamente.');
  }
}

testWorkflow().catch(err => {
  console.error('❌ Error en la prueba:', err);
  process.exit(1);
});

