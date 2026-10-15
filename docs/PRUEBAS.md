# Verificación de la entrega 2.1

Ejecutar `npm run check` y `npm test` desde la raíz del proyecto.

Se validaron sintaxis JavaScript y referencias locales; los `.gs` se compilan juntos en un contexto VM. No hay funciones duplicadas en los archivos propios del backend.

Los tests de backend ejecutan el código `.gs` entregado con emulaciones de SpreadsheetApp, Sheets.batchUpdate, Utilities, LockService y propiedades. Incluyen autenticación, roles, migración de contraseña y comparación de PBKDF2 con Node, alta/modificación/eliminación de empleados, cuentas desactivadas, sesión revocada, formulario con encabezados actuales, envío duplicado, cantidades inválidas, fechas inexistentes, aceptación, devoluciones parciales y completas, permanencia del historial, permisos de eliminación, conservación de movimientos y reservas antiguas.

Se simulan fallos antes de confirmar el lote y pérdida de respuesta después de guardarlo. La repetición del mismo identificador no repone inventario otra vez. Se comprueba que un conjunto mixto de registros activos/cerrados no se elimine parcialmente.

La integración carga los módulos ApiClient, EmployeeStore y LoanStore reales frente a esos `.gs` y ejecuta login → crear → aceptar/entregar → devolver → consultar historial → eliminar. También verifica el bloqueo y actualización tras una respuesta incierta.

Limitaciones: no se ejecutó el backend en Google, no se comprobaron permisos/OAuth/activadores/cuotas reales, no se realizó una auditoría de seguridad ni prueba de carga. No hay validación visual completa en navegador en esta entrega. Los datos de prueba usan dominios example.test y las pruebas no hacen conexiones de red.
