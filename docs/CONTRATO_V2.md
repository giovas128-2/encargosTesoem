# Contrato v2 — implementado en backend/ para instalar

Versión 2.1, 14 de octubre de 2026. Este documento describe las acciones implementadas en los `.gs` de `backend/` y consumidas por el frontend. Código probado localmente con servicios emulados; falta instalar y publicar en Google. Consulta INSTALAR_PASO_A_PASO.md.

No se enviaron POST al despliegue real, no se modificaron hojas/permisos y no se enviaron correos. El esquema actual usa `correo`, `fecha de devolucion`, `hora de devolucion` en formulario 2; `contraseña` y `correo` en usuarios; fecha_limite y correo en prestamos. El backend lee por encabezados y no devuelve secretos. Los GET anteriores de datos se retiran; GET solo anuncia versión.

## Transporte

POST a la URL de Apps Script, cuerpo JSON con Content-Type text/plain;charset=UTF-8. Respuesta JSON `{ok:true,...}` o `{ok:false,error:"Mensaje",codigo:"..."}`. Las fechas se serializan ISO 8601 con zona, ejemplo `2026-10-20T14:00:00-06:00` o UTC con Z. No devolver fechas localizadas, horas sueltas ni seriales de Sheets.

Todas las acciones salvo login reciben `token` en el cuerpo. El servidor determina el usuario responsable desde la sesión, nunca desde un encargado_id enviado por el navegador. Tokens impredecibles, caducidad, revocación y validación de rol/activo en cada operación. Sesión inválida usa codigo SESION_INVALIDA o SESION_EXPIRADA. No enviar password/contraseña ni hashes en respuestas.

## Acciones

| accion | Entradas adicionales | Respuesta |
|---|---|---|
| login | correo, password | token, expira ISO, usuario seguro |
| sesion | — | usuario seguro |
| logout | — | ok |
| panel | — | version:2, completo:true, materiales:[], prestamos:[], usuarios:[] (usuarios solo admin) |
| crear_solicitud | matricula,nombre,telefono,correo,items:[{material_id,cantidad}],fecha_limite,motivo,operacion_id | prestamo_id, estado:pendiente |
| aceptar_y_entregar | prestamo_id, operacion_id | prestamo_id, estado:entregado |
| confirmar_entrega_reservada | prestamo_id, fecha_entrega ISO, confirmacion:ENTREGADO, operacion_id | estado:entregado sin nuevo descuento; solo reservas antiguas comprobables |
| rechazar_solicitud | prestamo_id, operacion_id | estado:rechazado |
| registrar_devolucion | prestamo_id, material_id, cantidad, operacion_id | estado:parcial o devuelto |
| eliminar_historial | prestamo_id, operacion_id | ok |
| limpiar_historial | prestamo_ids:[], operacion_id | ok |
| guardar_empleado | usuario_id:null o existente,nombre,matricula,correo,telefono,rol,activo,password opcional al editar, operacion_id | ok |
| eliminar_empleado | usuario_id, operacion_id | ok |

`usuario` / cada elemento de `usuarios`: id, matricula, nombre, telefono, correo, rol (admin/administrador/encargada/encargado/empleado), activo booleano.

`materiales`: id,nombre,categoria,existencia_total,existencia_disponible,limite_por_solicitud,activo booleano.

Cada `prestamos` contiene id,matricula,nombre,telefono,correo,estado,fecha_solicitud,fecha_limite,fecha_entrega,fecha_devolucion,motivo y `detalles` completo con material_id,material,cantidad_solicitada,cantidad_entregada,cantidad_devuelta. Los estados canónicos son pendiente, entregado, parcial, devuelto, rechazado, cancelado. Aceptado se admite solo por compatibilidad con registros viejos y se muestra en activos con aviso.

`panel` debe recuperar TODOS los préstamos e historial conservado, no solo pendientes ni matrículas vistas en el navegador. Si se necesita paginación, acordarla antes de cambiar completo:true. Nunca reportar completo:true para un subconjunto.

## Reglas indispensables en el backend

1. `onFormSubmit` usa el encabezado actual `correo` (no `Correo electrónico` si no coincide). Combina `fecha de devolucion` + `hora de devolucion`, zona America/Mexico_City. Ignora únicamente la columna antigua ` fecha limite` de respuestas. Guarda la fecha combinada en `prestamos.fecha_limite`. Valida cada cantidad seleccionada, no omitir silenciosamente materiales con cantidad vacía. Usa ID estable del envío para impedir duplicados. Solo crear pendiente; no descontar stock.
2. Aceptar y entregar debe validar todo antes de escribir: estado pendiente, fecha completa/futura, usuario autorizado, materiales activos, cantidades enteras positivas, máximos y stock. Bajo LockService compartido con todas las demás operaciones, registrar estado entregado, fecha_entrega, cantidades entregadas, inventario descontado UNA vez y movimientos/responsable. No realizar dos POST desde la interfaz ni descontar nuevamente en registrarEntrega.
3. Un ScriptLock serializa todas las operaciones de este proyecto. Cada escritura usa un único Sheets.Spreadsheets.batchUpdate: inventario, detalles, préstamo, movimiento y comprobante en _operaciones se guardan juntos. Repetir el mismo operacion_id con los mismos datos devuelve la respuesta previa; con datos distintos se rechaza. RESULTADO_INCIERTO indica que no se pudo confirmar una escritura: el frontend bloquea hasta actualizar. No hay reintentos automáticos. No editar manualmente ni operar desde otro proyecto concurrente.
4. Registrar devolución exige estado activo y cantidad <= entregada-devuelta. Actualizar detalles, sumar SOLO la cantidad recibida a disponibles, registrar movimiento con fecha/responsable. Si falta cualquier material, queda parcial; cuando todos estén devueltos, estado devuelto y fecha_devolucion. No borrar el registro al devolver.
5. El historial se consulta desde Sheets en cada sesión. Eliminar/limpiar solo admin, solo terminales, validar TODO el conjunto antes de eliminar cualquier fila. No tocar activos ni inventario. Eliminar filas correspondientes y detalles de esos préstamos y conservar movimientos de auditoría. Guardar la acción de eliminación con responsable/fecha. La limpieza recibe IDs explícitos; no eliminar registros terminados después de abrir la confirmación.
6. Vencido es una vista derivada: activo + fecha completa válida < ahora. Debe seguir en activos. No cambiar devueltos/rechazados a vencido. Registros con fecha incompleta se muestran para corrección y no se comparan como medianoche/1899.
7. Usuarios: solo roles del personal y activo=true pueden entrar. Admin gestiona cuentas y elimina historial; encargados gestionan solicitudes y devoluciones. Desactivar/eliminar cuenta revoca sesiones. Impedir eliminar la propia cuenta o el último admin activo. Validar correo/matrícula únicos.
8. Restringir el acceso directo a la hoja: su exportación era accesible al revisar el esquema. El login admite la contraseña existente y la migra a PBKDF2-HMAC-SHA256 (600000 iteraciones, sal individual) al primer acceso correcto. Altas/cambios del panel guardan hash directamente. La sesión dura 8 horas, su token se guarda hasheado y se coteja la credencial vigente. Cuentas inactivas o eliminadas no acceden. El límite es 5 intentos por cuenta por 15 minutos y 60 inicios por ventana en todo el sistema; el contador de cuenta se reinicia al éxito salvo el primer acceso. El cambio de una cuenta desde el panel revoca sus sesiones. No publicar claves, contraseñas ni hashes en respuestas.
9. Correos: no implementados en este frontend. El registro de correo NO envía recordatorios. El trabajo programado debe residir en Apps Script y respetar material pendiente y último aviso. No se envió ningún correo de prueba.

## Registros existentes

No recalcular todo el stock a partir de solicitudes sin confirmar inventario físico. Revisar préstamos antiguos aceptados: el botón Confirmar entrega reservada completa cantidades y fecha física proporcionada por el encargado, SIN restar otra vez, cuando existe evidencia coherente de reserva. Si no se entregó, resolverlo con el encargado. Corregir fechas antiguas solo con el día real; no inventar fecha a partir de la hora. Las funciones antiguas crearPrestamo y usuarioTienePrestamoActivo se retiraron. No se impone un bloqueo de un préstamo por alumno: la oficina puede gestionar varias solicitudes, todas visibles en el panel.

## Despliegue

Actualizar backend en una copia de prueba con los mismos encabezados, probar contrato y flujos; luego publicar nueva versión de Apps Script. Conservar URL o actualizar assets/js/config/api-config.js. Guardar el editor de Apps Script no actualiza automáticamente la versión publicada /exec. Revisar activador único desde la hoja y permisos. No hay acceso de edición/despliegue a Apps Script desde este paquete.
