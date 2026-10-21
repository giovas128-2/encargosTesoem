# Instalar TESOEM 2.1

Esta guía requiere acceso de edición a Apps Script y a la hoja. El código se entrega listo para instalar; NO está publicado automáticamente en tu cuenta. Para evitar cambios parciales durante la instalación, avisa a la oficina y pausa el uso del formulario/panel mientras actualizas.

## 1. Respalda y prepara una copia de prueba

En Google Sheets crea una copia privada de la base actual. Conserva también el código anterior fuera del editor que vas a actualizar. Haz la primera instalación en una copia del proyecto vinculada a esa hoja; cambia `TESOEM.spreadsheetId` en `Codigo.gs` por el ID de la copia.

El ID del libro real ya está escrito en el archivo entregado. Si quieres probar en la copia, CAMBIA ese ID antes de ejecutar cualquier función. Conserva los encabezados y utiliza datos ficticios. Ninguna prueba local entregada escribe en la hoja real.

Restringe el acceso a la hoja: Compartir → Acceso general → Restringido. Solo los responsables que necesiten editar la base deben tener acceso. Ocultar pestañas no las protege de los editores. La hoja era exportable por enlace durante la revisión; cambia las contraseñas que pudieran haber quedado expuestas. El frontend no necesita leer la hoja directamente.

## 2. Reemplaza los archivos de Apps Script completos

Desde la hoja: Extensiones → Apps Script. Reemplaza TODO el contenido de cada archivo por su equivalente de `backend/`. No pegues las funciones nuevas debajo de las viejas.

| Archivo | Contenido nuevo |
|---|---|
| Código.gs o Codigo.gs | Configuración, comprobación de tablas e instalación |
| 01_APIS.gs | Entradas doGet/doPost y autorización |
| 02_SOLICITUDES.gs | Google Forms, fecha/hora y registro pendiente |
| 03_PRESTAMOS.gs | Panel, aceptación/entrega, devoluciones e historial |
| 04_MATERIALES.gs | Inventario, límites y movimientos |
| 05_UTILIDADES.gs | Lectura por encabezados, fechas, lotes e idempotencia |
| 06_USUARIOS.gs (nuevo) | Login, sesiones y gestión de empleados |
| 07_CRYPTO.gs (nuevo) | Biblioteca criptográfica incluida, copiar completa |

Los tres `myFunction()` vacíos desaparecen. No debe quedar otro `doPost`, `doGet`, `onFormSubmit`, `crearPrestamo` antiguo ni las funciones antiguas de prueba/limpieza. Se retiran porque escribían columnas antiguas o podían borrar todos los préstamos y reiniciar el inventario. El archivo adjunto original terminaba dentro de `diagnosticarCorreo`; los reemplazos incluyen cierres y sintaxis comprobados.

No copies los archivos `.txt`, `.md` ni pruebas Node dentro de Apps Script.

## 3. Habilita Google Sheets API y el manifiesto

En Configuración del proyecto, activa la opción para mostrar `appsscript.json` en el editor. Reemplaza su contenido con `backend/appsscript.json` y guarda. Incluye runtime V8, zona `America/Mexico_City`, permisos para Sheets y activadores, y el servicio avanzado Sheets v4.

Comprueba que aparezca **Sheets** en Servicios. Si falta, pulsa el signo + de Servicios y agrega Google Sheets API v4 con identificador `Sheets`. Si usas un proyecto de Google Cloud estándar, habilita también Google Sheets API en ese proyecto. El servicio permite que inventario, préstamo, detalles, movimiento y comprobante de operación se guarden juntos en una sola llamada.

No requiere una API key escrita en el frontend. La URL `/exec` es una dirección de implementación, no una contraseña.

## 4. Revisa encabezados y cuenta administradora

No es necesario mover las columnas. El código las encuentra por nombre, ignora mayúsculas y acentos, y admite `material:id` de movimientos como `material_id`.

- `usuarios`: id, matricula, nombre, telefono, rol, activo, fecha_registro, contraseña, correo.
- `prestamos`: id, matricula, nombre, telefono, estado, fecha_solicitud, fecha_limite, fecha_entrega, fecha_devolucion, motivo, correo.
- Las tablas de materiales, detalles, movimientos y configuración conservan sus encabezados actuales.
- `configuracion` debe contener `max_dias_prestamo` y `max_items_por_solicitud`, enteros positivos. Los días se cuentan como periodos de 24 horas desde la solicitud; no se borra la hora.
- Debe existir al menos una cuenta con rol `admin` o `administrador`, `activo` TRUE y correo único. Elige tú esa cuenta existente. No se crea ni se asciende automáticamente a ninguna persona.
- Encargados admiten rol `encargada`, `encargado` o `empleado`. Los alumnos no acceden al panel.
- Matrícula/teléfono/contraseña deben ser texto para conservar ceros iniciales. No compartas aquí sus valores.

La contraseña actual se admite al primer login y se sustituye en su misma celda por PBKDF2-HMAC-SHA256, 600000 iteraciones y sal individual. Las cuentas nuevas y los cambios hechos desde el panel ya guardan ese formato. No copies ese hash en el campo de contraseña al entrar: sigue usando la contraseña que elegiste. El primer acceso puede tardar más. Si alguien cambia la contraseña directamente en la hoja, sus sesiones previas dejan de ser válidas.

## 5. Ejecuta configuración una vez

Selecciona `configurarSistema` en el desplegable del editor y pulsa Ejecutar. Autoriza los permisos con la cuenta responsable del proyecto. Comprueba el registro: debe decir `ok:true` y mostrar al menos un administrador activo.

La función valida las tablas, crea `_sesiones`, `_operaciones` y `_accesos` si no existen, establece la zona horaria y guarda una propiedad interna para las firmas de operaciones. No borra ni recalcula préstamos/materiales. No borres las pestañas internas ni la propiedad `TESOEM_HUELLA_SECRET`: contienen sesiones y los comprobantes que impiden repetir escrituras. No las exportes ni las publiques.

Si muestra un error de encabezado, corrige solamente ese encabezado. `diagnosticarSistema` muestra nombres de tabla, número de filas y problemas de estructura, sin imprimir contraseñas.

## 6. Conecta el formulario

En el formulario vinculado a `Respuestas de formulario 2`, deja obligatorios:

- Nombre, Matricula, Telefono, correo y Motivo.
- Materiales que necesitas.
- fecha de devolucion (pregunta tipo fecha con año).
- hora de devolucion (pregunta tipo hora).
- Cantidad correspondiente a cada material elegido.

El script reconoce los cuatro materiales originales y sus preguntas de cantidad. Si agregas un material al inventario, hay que agregarlo también al formulario y al catálogo de `02_SOLICITUDES.gs`. En la revisión de la hoja no aparecía la pregunta de cantidad del adaptador: si ofreces Adaptador USB-C, añade `Cantidad de Adaptador USB-C`. No se acepta silenciosamente un material seleccionado sin cantidad.

La columna antigua `fecha limite` puede permanecer para conservar respuestas previas: no se lee. En cambio, NO borres `prestamos.fecha_limite`: ahí se guarda la combinación válida.

Ejecuta `instalarActivadorFormulario` desde el editor. Instala el activador desde la hoja, al enviarse el formulario, para la cuenta actual. Revisa en Activadores que exista un único activador operativo `onFormSubmit`; cada colaborador debe retirar los duplicados creados desde su propia cuenta. No ejecutes `onFormSubmit` manualmente: envía una respuesta de prueba.

El formulario conserva su propia respuesta aunque el backend la rechace por una cantidad/fecha inválida. Si no aparece la solicitud, revisa Ejecuciones. Corrige el formulario y envía nuevamente; no se reimportan automáticamente respuestas antiguas.

## 7. Publica una nueva versión

En Apps Script: Implementar → Administrar implementaciones → lápiz → Nueva versión → Implementar. Configura aplicación web, ejecutar como la cuenta responsable, acceso que permita al frontend externo llamar al endpoint (habitualmente Cualquier usuario, si la política de tu institución lo permite). Los datos privados requieren además el token de sesión del sistema.

Si la institución no permite ese tipo de acceso, habrá que alojar la interfaz dentro de Apps Script o adaptar la autenticación institucional; no desactives políticas de la escuela.

Conservar la implementación existente mantiene la URL `/exec`. Si creas otra, copia su URL a `assets/js/config/api-config.js`. Si existen otras implementaciones antiguas que exponen préstamos sin sesión, retíralas desde Administrar implementaciones; actualizar una no elimina las demás.

Abrir `/exec` debe devolver JSON con `version:2` y `revision:"2.1"`. Guardar los archivos en el editor por sí solo NO actualiza la versión publicada.

## 8. Actualiza el frontend y prueba el circuito

Copia los archivos del ZIP a tu proyecto conservando tu `.git`. Ejecuta `npm start` y abre http://localhost:3000. Para la copia de prueba, usa su nueva URL `/exec`.

1. Inicia sesión con correo/contraseña de personal de la copia.
2. Envía el formulario: debe aparecer en Solicitudes y NO reducir existencias.
3. Acepta y entrega dos cables: pasa a Activos y disponibles baja exactamente dos.
4. Devuelve uno: sigue activo como parcial y disponibles sube uno.
5. Devuelve el restante: desaparece de Activos, aparece en Historial y stock recupera su valor inicial.
6. Cierra sesión y vuelve a entrar: el historial debe seguir ahí.
7. Con un encargado, verifica que no pueda gestionar empleados ni eliminar historial.
8. Con admin, elimina el préstamo cerrado: se quita de préstamos/detalles, no cambia inventario y permanece su auditoría en movimientos.
9. Para probar vencidos en la copia, cambia la fecha límite de un préstamo activo a una fecha/hora completa pasada: debe aparecer en Activos y Vencidos. El vencimiento no convierte estados ni modifica stock.
10. Solo después de estas pruebas, instala/publica en la base real y vuelve a comprobar con una operación supervisada por la oficina.

No ejecutes pruebas masivas sobre la base real. Los tests Node del ZIP no requieren credenciales ni conexión a Google.

## Registros anteriores y límites

Los préstamos antiguos `aceptado` aparecen en Activos con el botón Confirmar entrega reservada. Registra la fecha/hora REAL de entrega y confirma que se entregó todo. El backend verifica que existan movimientos de reserva por la misma cantidad y NO vuelve a descontar. Si no hay evidencia coherente, pide revisión manual en lugar de inventar existencias. Las fechas inválidas deben corregirse con el día real, no con una fecha supuesta.

Si hay registros creados con el antiguo esquema de ocho columnas o estado `registrado`, el panel indicará el ID problemático. Corrígelos en la copia contrastando sus datos originales antes de publicar; no hay migración automática porque `usuario_id` no es lo mismo que matrícula. No restaures disponible=total si hay material prestado.

El bloqueo coordina este proyecto de Apps Script. No protege contra editores que cambien celdas a mano ni otros proyectos que escriban simultáneamente: concentra las escrituras en esta implementación y limita editores. El historial se elimina en bloques de hasta 500 registros; para historiales muy grandes usa varios bloques.

Las fechas nuevas se guardan como ISO con zona (por ejemplo UTC con Z), no como hora aislada. El panel las presenta en Ciudad de México. La conversión de fechas del formulario presupone día/mes/año para configuración México; también admite año-mes-día.

Esta entrega registra correo pero NO instala ni envía recordatorios Gmail. En los archivos recibidos no había esa función. Se puede añadir posteriormente un activador de avisos con control del último correo enviado; no hace falta modificar el flujo de préstamos.

## Fuentes técnicas y dependencia

- Lotes atómicos de Sheets: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
- Habilitar servicios avanzados: https://developers.google.com/apps-script/guides/services/advanced
- Criptografía: @noble/hashes 1.8.0, bundle IIFE de sha256/pbkdf2/utilidades; licencia MIT incluida. Fuente: https://github.com/paulmillr/noble-hashes/tree/1.8.0

La verificación local compara el PBKDF2 del bundle con la implementación estándar de Node al mismo número de iteraciones. No se hizo una auditoría de seguridad ni una prueba de carga del entorno Google. Es un sistema escolar pequeño; los límites de ejecución y cuotas de Apps Script siguen aplicando.
