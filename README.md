# Software de Envíos Automatizados por WhatsApp
**Proyecto:** Kumon Los Presidentes (Orientadora Ximena) & Escalamiento Comercial  
**Ubicación:** `e:\Software-Envio`

---

## 📋 Descripción del Proyecto

Aplicación web local desarrollada para automatizar el despacho personalizado de mensajes de texto y afiches/fotografías a apoderados a través de WhatsApp. Cuenta con un diseño pensado para usuarios no técnicos (como la orientadora Ximena), soporte para carga de listas en Excel/CSV, simulación en vivo y mecanismos avanzados de protección anti-bloqueo.

---

## 🚀 Inicio Rápido

### Opción 1: Acceso Directo (Recomendado para Ximena)
Haz doble clic sobre el archivo ejecutable:
```text
iniciar.bat
```
Esto abrirá automáticamente la consola y tu navegador web en `http://localhost:3000`.

### Opción 2: Desde la Terminal
```bash
npm start
```
Luego abre tu navegador en: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Pruebas con Datos Simulados (Sin Riesgo)

El sistema incluye datos de prueba listos para usar sin necesidad de configurar archivos previos ni conectar WhatsApp:

1. Inicia la aplicación y ve a la sección **1. Lista de Contactos**.
2. Haz clic en el botón:
   ```text
   ⚡ Cargar Datos de Prueba (5 Apoderados)
   ```
3. Verás cargada la lista de prueba (`contactos_prueba.xlsx`) con 5 apoderados:
   - Camilo Pérez (Alumno: Martín Pérez - Matemáticas)
   - Marcela Soto (Alumna: Sofía Gómez - Lenguaje)
   - Andrea Fuentes (Alumno: Lucas Fuentes - Matemáticas)
   - Rodrigo Valdés (Alumna: Florencia Valdés - Lenguaje)
   - Claudia Muñoz (Alumno: Mateo Muñoz - Matemáticas)
4. En la sección **2. Mensaje a Enviar**, selecciona la plantilla rápida **⭐ Reseñas Google (5 estrellas)** o **🎓 Avance Kumon**.
5. Puedes hacer clic en **🖼️ Usar Afiche de Prueba Kumon** para adjuntar la imagen conmemorativa de los 26 años.
6. En la columna derecha podrás ver el **Simulador en Vivo de WhatsApp**, observando cómo se reemplazan automáticamente las variables `{nombre}`, `{alumno}` y `{materia}` para cada apoderado.
7. Asegúrate de que el interruptor esté en **Modo Simulación** y haz clic en **Iniciar Simulación de Envío**.
8. Podrás observar en tiempo real la barra de progreso, la consola de logs y la actualización de estados en la tabla.

---

## 📱 Modo Real (WhatsApp Web)

Cuando Ximena desee realizar el envío real a los apoderados:
1. Haz clic en el botón superior **"Vincular WhatsApp"**.
2. Aparecerá en pantalla el Código QR generado en vivo.
3. Desde el teléfono de Ximena:
   - Abrir WhatsApp > Menú (3 puntos) o Ajustes > **Dispositivos vinculados** > **Vincular un dispositivo**.
   - Escanear el código QR en pantalla.
   - El sistema guardará la sesión en la carpeta `.wwebjs_auth` de manera que **no será necesario volver a escanearlo** en futuros arranques.
4. Cambia el selector a **Modo Real (WhatsApp Web)**.
5. Presiona **🚀 Iniciar Envío Real**.

---

## 🛡️ Mecanismos de Protección Anti-Bloqueo (Anti-Ban)

- **Jitter Aleatorio:** Intervalo configurable entre mensajes (por defecto 5 a 12 segundos aleatorios).
- **Batching (Pausas por Lotes):** Descanso programado tras cada bloque de mensajes (por defecto 45 segundos cada 25 envíos).
- **Validación de Teléfonos:** Detección automática y formateo con código de país (+569 para Chile).

---

## 📂 Estructura del Código

```text
e:\Software-Envio\
├── data/
│   ├── contactos_prueba.xlsx    # Base de datos Excel con 5 apoderados de prueba
│   ├── contactos_prueba.csv     # Formato alternativo CSV
│   ├── imagen_prueba.png        # Afiche gráfico de prueba para adjuntos
│   └── ejemplo_afiche.svg       # Vector original del banner Kumon
├── src/
│   ├── server.js                # Servidor Express, API REST y WebSockets (Socket.IO)
│   ├── contactsParser.js        # Parser de archivos Excel/CSV y normalizador de teléfonos
│   ├── senderEngine.js          # Motor de colas, delays anti-ban, logs y simulación
│   └── whatsappManager.js       # Manejador de sesión y cliente whatsapp-web.js
├── public/
│   ├── index.html               # Panel visual para Ximena (Tailwind CSS)
│   └── app.js                   # Lógica reactiva de la interfaz web
├── test_workflow.js             # Script de pruebas automatizadas del flujo
├── iniciar.bat                  # Lanzador directo para Windows
└── package.json                 # Dependencias y scripts
```

