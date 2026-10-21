# WhatsApp manual en préstamos vencidos

## Instalación
Reemplaza el frontend con esta versión, conserva tu URL en assets/js/config/api-config.js y ejecuta npm start. Abre la dirección que indique la terminal e inicia sesión. En Préstamos vencidos aparece Enviar WhatsApp.

El botón abre el mensaje generado por Apps Script. El encargado debe revisarlo y enviarlo personalmente. No se actualiza estado_contacto ni fecha_contacto al abrir el enlace. La alternativa Abrir en esta pestaña permite continuar cuando el navegador impide abrir otra ventana.

## Backend existente
Los archivos backend/ incluidos en el ZIP se conservaron SIN CAMBIOS respecto al archivo recibido. No los copies sobre tu proyecto Apps Script actual: tu versión compartida en el chat ya agrega recordatorios y puede ser más reciente.

La versión desplegada debe incluir obtenerRecordatoriosWhatsApp() y, dentro de procesarAPI_, DESPUÉS de autenticar_(db,d.token):

    if (d.accion === 'recordatorios_whatsapp') {
      return {ok:true, recordatorios:obtenerRecordatoriosWhatsApp()};
    }

No dupliques doPost ni procesarAPI_. Si ese bloque ya existe, conserva el actual. Si aún no está publicado, actualiza la implementación web con una nueva versión y conserva su URL.

La hoja Recordatorios usa estos encabezados, en orden:
prestamo_id, matricula, nombre, telefono, fecha_limite, estado, mensaje, enlace_whatsapp, estado_contacto, fecha_contacto.

El generador actualizarRecordatoriosWhatsApp() debe ejecutarse mediante el activador ya configurado. El frontend NO ejecuta ese generador: Actualizar solo lee la lista. Si acaba de vencer un préstamo o cambió su devolución parcial, la hoja puede seguir pendiente de la siguiente ejecución. Revisa las cantidades del mensaje antes de enviarlo.

Mejora aconsejada en el generador compartido: limitar estados a entregado/parcial para excluir también cancelados, y coordinar su escritura con el bloqueo del resto del backend. Esta entrega no modifica ese generador ni configura activadores.

## Archivos cambiados
- assets/js/services/whatsapp-service.js: lectura autenticada única por actualización; índice por prestamo_id; validación de URL, teléfono, matrícula y fecha; errores independientes del panel.
- assets/js/components/whatsapp.js: botón manual, aviso y alternativa de apertura.
- assets/js/components/loan-card.js: integración opcional únicamente en vencidos.
- assets/js/views/loans.js: activación en vencidos y reintento.
- assets/js/core/router.js: sincronización de recordatorios después del panel.
- assets/js/services/api-client.js: error específico de acción no desplegada; lectura de recordatorios no se presenta como escritura incierta.
- interfaces/index.html: carga de los nuevos scripts.
- assets/css/main.css: estilos con ajuste de texto para móvil.
- tests/whatsapp.test.cjs y package.json: pruebas automatizadas.
- docs/WHATSAPP.md: estas instrucciones.

## Verificación
npm run check
npm test

Las pruebas usan respuestas controladas: no envían mensajes ni modifican Google Sheets. No se comprobó la implementación real con credenciales ni el envío de WhatsApp. Comprobar manualmente en escritorio y móvil: abrir Vencidos, revisar préstamo y número, abrir WhatsApp, regresar; probar ausencia de enlace y sesión vencida. No marcar el contacto como enviado hasta enviarlo realmente.
