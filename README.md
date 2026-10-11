# TESOEM · Frontend integrado con Apps Script (v1.1)

HTML, CSS y JavaScript sin framework. Esta versión utiliza la URL de la API proporcionada para materiales, solicitudes y préstamos. **Las acciones del panel ya pueden modificar Google Sheets.** El login y los empleados siguen siendo locales porque su API aún no está documentada.

## Inicio rápido en Windows

1. Extrae todo `forntend.zip` en una carpeta nueva.
2. Abre en VS Code la carpeta que contiene `package.json`, `interfaces`, `assets` y `scripts`.
3. En su terminal ejecuta:

```bash
npm start
```

4. Abre **http://localhost:3000**. No necesitas `npm install`.

Si aparece `Missing script: start`, comprueba con `dir` que estás en esta carpeta y no en otro proyecto Vite. Alternativa con Python: `py -m http.server 3000 --bind 127.0.0.1`. Se necesita localhost o HTTPS para las cuentas locales; evita abrir con doble clic.

## Acceso local de pruebas

| Rol           | Matrícula | Contraseña |
| ------------- | --------- | ---------- |
| Administrador | encargada | Demo2026   |
| Empleado      | EMP002    | Demo2026   |

Estas cuentas no autentican al usuario ante Apps Script. La API recibida utiliza el operador `USR-003` para todas las operaciones administrativas. Este ID no es un secreto ni una prueba de identidad. **No usar el panel como sistema de producción hasta que el backend autentique y autorice al empleado real.** Crear cuentas en Empleados no crea usuarios de Google Sheets.

## Conexión incluida

La configuración única está en `assets/js/config/api-config.js`. Contiene la URL recibida y `encargadoId: 'USR-003'`. No hace falta pegar la URL nuevamente.

- Catálogo y disponibilidad: `materiales`.
- Solicitudes: `prestamos_pendientes`.
- Consulta por matrícula: `prestamos_usuario`.
- Registro manual real: `crear_solicitud`.
- Aceptar y reservar: `aceptar_solicitud`.
- Rechazar: `rechazar_solicitud`.
- Entrega física: `registrar_entrega`.
- Devolución de un material a la vez: `registrar_devolucion`.

**Aceptar** reserva inventario y deja el estado Aceptado. **Confirmar entrega física**, en Por entregar, marca Entregado sin descontar otra vez. Las devoluciones reincorporan existencias en el backend. El frontend nunca calcula ni persiste cambios al stock.

## Alcance de los datos visibles

La API no tiene una consulta de todos los préstamos. Las pantallas Activos, Vencidos e Historial muestran **solo préstamos de las matrículas consultadas durante la sesión**. Usa el formulario de matrícula dentro de esas pantallas. No se conservan registros de alumnos en localStorage ni se pretende que esos totales representen toda la escuela.

La consulta real de pendientes no incluyó `detalles`; el adaptador consulta automáticamente cada matrícula para obtener los materiales. Si aun así falta ese arreglo, deshabilita aceptación, entrega y devolución, mostrando el motivo.

Los datos se actualizan cada 45 segundos mientras el panel está visible y no estás completando un formulario o diálogo. Puedes usar Actualizar. Si falla una consulta, se conserva la vista anterior marcada como desactualizada y se bloquean escrituras.

## Prueba del flujo

1. Entra con la cuenta local.
2. Espera la confirmación de datos recibidos de la API.
3. Revisa una solicitud pendiente, sus materiales y cantidades.
4. Solo con un registro autorizado, pulsa Aceptar y reservar y confirma.
5. En Por entregar, confirma la entrega presencial.
6. En Activos, registra la devolución por material y cantidad recibida.
7. Si falta algún material el estado será Parcialmente devuelto; al completar será Devuelto.

El registro manual es una alternativa de integración que **crea datos reales**, no el formulario simulado de v1.0. Requiere confirmar explícitamente antes de enviarlo. El flujo principal de estudiantes sigue siendo Google Forms presencial; falta su enlace para el QR.

## Pendientes del backend

- Autenticación y sesiones del personal, y permisos validados en cada endpoint.
- Crear, editar, eliminar y consultar empleados con sus IDs reales.
- Consulta global filtrable de préstamos para el panel completo.
- Campo correo en solicitudes y consultas; ahora solo se documenta teléfono.
- Envío programado y registro de recordatorios por Gmail. No se envían correos desde este frontend.
- Enlace de Google Forms y validación del circuito de registro presencial.
- Motivo de rechazo: el endpoint actual no lo recibe.

## Carpetas

| Ruta                                     | Responsabilidad                                         |
| ---------------------------------------- | ------------------------------------------------------- |
| `interfaces/`                            | HTML del login y del panel                              |
| `assets/css/`                            | Diseño y responsive                                     |
| `assets/js/config/`                      | URL y opciones de integración                           |
| `assets/js/services/api-client.js`       | HTTP, errores y tiempos de espera                       |
| `assets/js/services/loan-service.js`     | Mapeo API y operaciones de préstamos                    |
| `assets/js/services/employee-service.js` | Empleados locales de demostración                       |
| `assets/js/components/`                  | Navegación, tarjetas, mensajes y diálogos               |
| `assets/js/views/`                       | Resumen, préstamos, inventario, empleados y formularios |
| `assets/js/core/`                        | Rutas, estado y acceso local                            |
| `docs/`                                  | Contrato proporcionado y notas para Sebas               |
| `tests/`                                 | Pruebas sin escrituras de red                           |
| `scripts/`                               | Servidor local y comprobación de archivos               |

## Verificación

```bash
npm run check
npm test
```

El 6 de octubre de 2026 se verificaron mediante GET reales materiales, pendientes y préstamos de una matrícula obtenida de los pendientes: respuestas HTTP 200 y `ok: true`. Las escrituras se verificaron con respuestas simuladas, **no contra Sheets**, para no crear ni modificar préstamos de prueba sin necesidad. La lectura HTTP desde herramientas no garantiza que el navegador pueda completar todos los POST: falta la prueba CORS y visual desde localhost.

Si un POST pierde la respuesta, no se reintenta automáticamente. La operación podría haberse aplicado: actualiza y revisa el estado antes de repetir. Más detalles en `docs/FLUJO_Y_BACKEND.md`.
