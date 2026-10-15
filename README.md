# TESOEM · Préstamos de materiales 2.1

Frontend HTML/CSS/JavaScript verde bandera y blanco, con backend Google Apps Script.

## Estado de la entrega

Código preparado y probado localmente, incluyendo los archivos `.gs` recibidos de Sebas como base de la adaptación. **Todavía hay que instalar el backend y publicar una nueva versión en tu cuenta de Google.** No se modificó la hoja real, no se probaron contraseñas reales y no se enviaron correos. Las pruebas locales emulan los servicios de Google; no sustituyen la prueba del despliegue, permisos, navegador y activador real.

**Empieza por `docs/INSTALAR_PASO_A_PASO.md`.** No basta reemplazar el frontend: la URL configurada sigue siendo la del despliegue anterior hasta que lo actualices.

## Ejecutar frontend

Con Node.js 18 o superior, sin instalar dependencias:

```sh
npm start
```

Abre http://localhost:3000. Inicia sesión con una cuenta activa de personal registrada en `usuarios`, usando correo y contraseña. No hay cuentas demo ni contraseñas incrustadas.

```sh
npm run check
npm test
```

## Flujo

Formulario presencial → Solicitudes → **Aceptar y entregar** → Préstamos activos → **Registrar cantidad devuelta** → Historial cuando se devuelve todo. Vencidos muestra también los activos que pasaron la fecha y hora; no cambia su estado ni los quita de activos. Rechazos y cancelaciones existentes se consultan en historial.

Una aceptación registra la entrega completa de lo solicitado. Una devolución permite seleccionar material y cantidad realmente recibida; si quedan unidades, continúa activo. El servidor descuenta una sola vez y repone solo lo devuelto. El historial se guarda en Sheets y solo el administrador puede eliminar registros cerrados. La auditoría de movimientos se conserva. Las cuentas y permisos también se gestionan desde el servidor.

## Estructura

- `interfaces/`: login separado y panel.
- `assets/css/`: estilos responsive.
- `assets/js/components/`: navegación, tarjetas, diálogos, mensajes.
- `assets/js/views/`: solicitudes, activos, vencidos, historial, inventario y empleados.
- `assets/js/services/`: transporte, sesiones y datos remotos.
- `assets/js/config/api-config.js`: URL `/exec` del despliegue.
- `backend/`: reemplazos completos de Apps Script y manifiesto.
- `docs/INSTALAR_PASO_A_PASO.md`: instalación y prueba real.
- `docs/CONTRATO_V2.md`: acciones y formato de datos implementados.
- `tests/`: pruebas del frontend y de los `.gs` con servicios Google emulados.

Se conserva fecha + hora de devolución del formulario y se ignora únicamente su columna antigua `fecha limite`. En `prestamos`, la columna `fecha_limite` sí se usa: contiene la fecha y hora combinadas. Las fechas nuevas se guardan como texto ISO completo con zona; el panel muestra hora de Ciudad de México. Los valores Date anteriores también se leen. Fechas ambiguas no se adivinan.

La URL de Google Forms no se recibió: la pantalla QR conserva un aviso hasta integrar ese enlace. El registro de correo no activa recordatorios; esta entrega no agrega un servicio de envío automático.

## Actualizar tu repositorio

Copia estos archivos en tu carpeta de trabajo conservando tu propia carpeta `.git`. Revisa `git diff`, ejecuta las pruebas y crea el commit. No subas exportaciones de usuarios, contraseñas, tokens ni propiedades secretas de Apps Script. El bundle criptográfico y su licencia sí forman parte del código público.
