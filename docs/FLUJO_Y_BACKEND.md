# Integración para Sebas · 6 de octubre de 2026

## Contrato usado

Se conserva el documento recibido en `CONTRATO_API.txt`. Solo se implementan sus acciones, sin inventar endpoints ni considerar el frontend una fuente de inventario.

## Diferencias observadas al consultar el despliegue

- `materiales`: HTTP 200, `ok:true`, cuatro materiales y los campos documentados.
- `prestamos_pendientes`: HTTP 200, `ok:true`, encabezados sin `detalles` en el registro consultado.
- `prestamos_usuario`: HTTP 200, `ok:true`, préstamos con `detalles` y cantidades solicitadas, entregadas y devueltas.

El frontend resuelve los pendientes por matrícula y une por ID de préstamo para evitar duplicados. Si una consulta falla, no publica un nuevo snapshot parcial como completo. No se incluyen aquí los datos personales de las respuestas.

## Estados

| API       | Interfaz                |
| --------- | ----------------------- |
| pendiente | Pendiente               |
| aceptado  | Aceptado / Por entregar |
| entregado | Entregado               |
| parcial   | Parcialmente devuelto   |
| devuelto  | Devuelto                |
| rechazado | Rechazado               |

Vencido es un indicador sobre préstamos entregados/parciales con fecha límite pasada. Una reserva aceptada no se representa como material entregado.

## Transporte y CORS

Los GET agregan los parámetros con URLSearchParams. Los POST serializan JSON en el cuerpo y usan por defecto `Content-Type: text/plain;charset=UTF-8` para no provocar un preflight solo por application/json. Apps Script debe analizar `JSON.parse(e.postData.contents)` también con ese MIME. Esta compatibilidad de POST sigue pendiente de verificación en el despliegue real.

Si el backend exige application/json, ajustar `postContentType` y resolver CORS/preflight en la arquitectura antes de probar. Nunca usar `mode:no-cors`: impediría leer la respuesta y distinguir éxito de error. El GET final inspeccionado respondió `Access-Control-Allow-Origin: *`; no se considera eso una prueba de POST en navegador.

Cada petición tiene timeout de 25 segundos. No hay reintentos de escrituras. Se comprueban HTTP, JSON, `ok` y mensajes de error. Una respuesta perdida deja resultado incierto y bloquea nuevas operaciones hasta actualizar. Para garantizar reintentos seguros se necesita idempotencia en el backend.

## Devoluciones

El endpoint opera sobre un único material. La interfaz pide material y cantidad por separado. No simula una transacción atómica enviando varios materiales a la vez. Después de cada éxito consulta el estado autoritativo, permitiendo ver una devolución parcial sin repetir cantidades.

## Fechas

El formulario interpreta la fecha/hora en Ciudad de México y envía ISO con offset explícito `-06:00`. Las fechas de respuesta se muestran en `America/Mexico_City`. Conviene mantener las respuestas ISO con Z u offset. La validación definitiva debe hacerla Apps Script.

## Empleados y permisos

Se preserva la gestión local con contraseña derivada mediante PBKDF2, salt individual y roles de demostración. No constituye control de acceso a Apps Script. Todas las acciones administrativas de integración envían el `USR-003` documentado. No se inventa una correspondencia entre matrículas locales y IDs reales de encargados.

Para producción hacen falta autenticación de personal, sesiones verificables, y autorización backend que no confíe solo en un ID aportado por el navegador. El listado, altas, cambios y bajas de empleados también requieren endpoints. No almacenar contraseñas en texto plano en Sheets.

## Datos que aún faltan

1. Consulta global de préstamos con filtros por estado y, si aplica, paginación. Hasta entonces los contadores de activos/vencidos/historial son solo de alumnos consultados en la sesión.
2. Correo electrónico en creación, Forms y consultas. Actualmente hay teléfono; no se reemplaza silenciosamente el correo por ese dato.
3. Trigger o proceso programado de Gmail, política de frecuencia, registro de envíos y prevención de duplicados. No existe un botón que afirme haber enviado correos.
4. Enlace del formulario para crear el QR real.
5. Parámetro para motivo del rechazo si se desea guardarlo.
6. Validación de concurrencia del inventario y autorización en todas las mutaciones.

## Validación realizada

- Sintaxis JS y referencias de HTML.
- Transporte GET/POST, parámetros, MIME y tratamiento de errores con mocks.
- Hidratación de pendientes sin detalle usando la consulta por matrícula.
- Aceptar separado de entregar y sin modificar stock localmente.
- Devoluciones parciales/completas y límites por material.
- Estados vencidos, datos incompletos, consultas fallidas y respuestas de escritura inciertas.
- Solo lecturas reales; no se ejecutó ningún POST real ni envío de correo.

El sitio alojado de la versión anterior no se modifica con esta entrega. La versión integrada se entrega en el ZIP para ejecutarla localmente y continuar las pruebas con Sebas.
