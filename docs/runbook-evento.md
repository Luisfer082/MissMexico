# Runbook del evento — Miss México

Qué hacer el día del evento y qué hacer cuando algo falla. **Imprímelo**: si falla la red, este
documento no debe depender de ella.

> **BORRADOR (2026-10-01).** Los campos `[…]` se llenan con Luis antes del simulacro. Se valida en el
> simulacro y se corrige con lo que salga ahí.

---

## 1. Quién opera qué

| Rol en la app | Persona | Dispositivo | Respaldo |
|---|---|---|---|
| Encargado | […] | Laptop […] | […] (2.º encargado activo) |
| Director | […] | Tableta […] | […] |
| Anunciador | […] | Laptop al proyector | Misma laptop, pantalla espejo |
| Jueces (×[…]) | […] | Tabletas/celulares […] | 1 tableta de repuesto cargada |
| Soporte técnico | Luis | Laptop con acceso a Supabase y Vercel | — |

**Siempre debe haber al menos 2 encargados activos**: si el único se queda fuera, nadie puede dar
de alta usuarios ni cerrar etapas.

## 2. La víspera

- [ ] Proyecto de Supabase **activo** (el plan gratuito lo pausa tras ~1 semana sin uso): entrar a la
      app y comprobar que carga.
- [ ] Respaldo (plan gratuito = Supabase NO guarda backups): botón **Respaldo** en el panel del
      encargado. Para copiar también las fotos: `npm run respaldo -- --con-fotos` desde la laptop.
      Guardar los archivos en USB o nube: son confidenciales.
- [ ] En Vercel, el deploy de producción es el congelado ([commit …]); nada nuevo en `main`.
- [ ] Edición del evento **activa**, con participantes, fotos, etapas, retos y títulos.
- [ ] Cuentas creadas y probadas: cada juez entra una vez desde SU dispositivo.
- [ ] Credenciales impresas en sobres, una por persona.
- [ ] Dispositivos cargados al 100 %, cargadores y regletas, la tableta de repuesto con sesión de
      prueba cerrada.

## 3. La mañana del evento

- [ ] WiFi del lugar probada desde cada dispositivo. Tener un **hotspot de respaldo** (celular con
      datos) para encargado y anunciador.
- [ ] Todos inician sesión y ven su pantalla.
- [ ] Prueba de una nota por juez en una ronda de ensayo, y borrarla después.
- [ ] Anunciador: proyector, presentador inalámbrico, pantalla completa, legible desde el fondo.
- [ ] Desactivar el ahorro de pantalla y la suspensión en la laptop del anunciador.

## 4. Durante el evento

- Los jueces califican; el estado debe decir **sincronizado**. Si dice "sin conexión", **siguen
  calificando**: las notas se guardan en el dispositivo y se envían solas al volver la red.
- **Antes de cerrar cada ronda o etapa**, el encargado lee el aviso de faltantes. Si falta alguien,
  se le pide que revise su conexión y se pulsa "Volver a revisar". Solo se cierra con faltantes si
  se decide conscientemente.
- **Cerrar una etapa es IRREVERSIBLE.** Lo hace solo el encargado, en voz alta, con el director
  presente.
- Al cerrar cada etapa: **exportar el PDF** como respaldo en papel y descargar el respaldo
  con el botón **Respaldo** del panel (tarda segundos).

## 5. Si algo falla

### Se cae el WiFi
- Jueces: siguen calificando (offline). **No cerrar sesión ni borrar datos del navegador.**
- Encargado y anunciador: pasar al hotspot de respaldo.
- No cerrar rondas hasta que vuelva la red y el aviso de faltantes esté en verde.

### Un juez pierde la sesión o la contraseña
- Encargado → Usuarios → **resetear contraseña** (no eliminar: borrar a un juez se lleva sus
  calificaciones). Se le entrega la nueva en mano.
- Si tenía notas sin enviar, vuelve a entrar **en el mismo dispositivo**: siguen ahí.

### Se descompone el dispositivo de un juez
- Sus notas ya enviadas están a salvo. Las que no se enviaron se pierden con el dispositivo.
- Entra en la tableta de repuesto con su usuario y recaptura lo que el aviso marque como faltante.

### Se cierra una etapa por error
- **No se puede reabrir** (regla de la BD). El snapshot ya quedó grabado con lo que había.
- Lo que sigue: [decidir con Luis antes del evento — p. ej. continuar con la siguiente etapa y
  registrar el incidente; las notas ya capturadas siguen en el snapshot y en el PDF].

### Se recarga o se cuelga la pantalla del anunciador
- Recargar: el show retoma en el mismo título (el avance se guarda en la BD).
- Si la laptop muere: entrar con la cuenta del anunciador en otra laptop; también retoma.

### El director ve algo distinto a lo que proyecta el anunciador
- El director pulsa **Retirar**, revisa que no haya "cambios sin guardar", **Guarda** y vuelve a
  **Enviar**.

### Supabase o Vercel caídos
- Ver estado: status.supabase.com y vercel-status.com.
- Vercel: si el problema es un deploy, **rollback** al anterior desde el dashboard (instantáneo).
- Supabase caído: los jueces siguen offline. El resto espera. Plan B: [hojas de papel impresas
  para jueces + PDF de la última etapa cerrada].

## 6. Al terminar

- [ ] Todas las etapas cerradas; exportar Excel y PDF finales.
- [ ] Respaldo final: botón **Respaldo** + `npm run respaldo -- --con-fotos`.
- [ ] Guardar los archivos en [ubicación] — son confidenciales.
- [ ] Desactivar las cuentas de jueces.
