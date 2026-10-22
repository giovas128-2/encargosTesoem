# Actualización visual — 21 de octubre de 2026

Esta entrega cambia la apariencia y los mensajes que muestra la interfaz. Conserva el verde bandera y blanco, añade fondos luminosos, sombras suaves, tarjetas y botones con respuesta al cursor, formularios más legibles y ajustes para pantallas pequeñas. Las animaciones respetan la preferencia de movimiento reducido.

## Cómo instalar
1. Descomprime el ZIP fuera de tu carpeta actual.
2. Entra a EncargosTesoemActualizado/encargosTesoem y copia los archivos de la lista de abajo a las mismas rutas de tu proyecto actual. Agrega polish.css; los demás reemplazan los existentes.
3. Conserva tu carpeta del repositorio y su historial Git. Este ZIP no incluye la carpeta interna .git.
4. Ejecuta npm start desde tu proyecto y recarga con Ctrl + Shift + R.
5. Sube esos cambios a tu repositorio habitual. No necesitas modificar ni volver a publicar Apps Script por esta actualización.

## Archivos modificados
- assets/css/main.css
- assets/js/components/layout.js
- assets/js/components/loan-card.js
- assets/js/components/whatsapp.js
- assets/js/services/api-client.js
- assets/js/services/employee-service.js
- assets/js/services/loan-service.js
- assets/js/services/whatsapp-service.js
- assets/js/views/employees.js
- assets/js/views/inventory.js
- assets/js/views/loans.js
- assets/js/views/qr.js
- assets/js/views/request-simulator.js
- interfaces/login.html
- assets/css/polish.css

Los cambios en services son exclusivamente mensajes de error dirigidos al usuario. Se mantuvieron las acciones, validaciones, permisos, solicitudes de red, identificadores, rutas, sesiones y frecuencia de actualización. Los archivos backend, la configuración de conexión y las pruebas son idénticos a los del ZIP recibido.

## Ejemplos de textos
- “Datos recibidos de la API” → “Información actualizada”.
- “Registro guardado en Google Sheets” → “Registro guardado correctamente”.
- “API real” → mensajes relacionados con el servicio de la oficina.
- Mensajes de conexión y avisos de WhatsApp con instrucciones sencillas.

Los mensajes internos del servidor se conservan cuando provienen directamente de Apps Script; esta entrega no modifica ese código.

## Comprobaciones realizadas
- npm run check: sintaxis y referencias locales correctas.
- npm test: pasaron las pruebas existentes de acceso, préstamos, inventario, devoluciones, historial, recuperación de operaciones y WhatsApp, con datos de prueba y backend emulado.
- Comparación con el ZIP recibido: sin cambios en backend, configuración ni pruebas.
- La revisión visual en navegador quedó pendiente: el navegador de pruebas no pudo instalarse en este entorno. Antes de publicar, revisa login, inventario y formularios en tu computadora y celular.

No se modificaron datos reales, no se enviaron mensajes y no se realizó un despliegue.
