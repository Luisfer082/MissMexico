# Checklist de QA — Miss México (Fase 10, Bloque 3)

Se recorre completo **contra el entorno que se va a usar en el evento**, con los dispositivos reales.
Marca cada casilla en vivo; si algo falla, anota rol, dispositivo, pantalla y el mensaje exacto.

**Dispositivos mínimos:** laptop (Chrome), tableta (Safari iPad), celular de juez (Chrome Android y
Safari iPhone si los hay), y el proyector del evento.

**Antes de empezar:** una edición de prueba activa con 6+ participantes con foto, 2 etapas, 3 retos,
una ronda de jueces con 2 jueces, y una cuenta por rol.

---

## 1. Encargado (laptop y tableta)

- [ ] Iniciar sesión → aterriza en Inicio.
- [ ] **Ediciones:** crear una edición (se generan los títulos estándar), activarla (pide
      confirmación), renombrar un título y agregar/quitar uno.
- [ ] **Participantes:** alta con foto, editar, reemplazar foto, quitar foto. Repetir una banda →
      mensaje en español.
- [ ] **Etapas:** crear, editar, repetir orden o nombre → mensaje en español.
- [ ] **Retos:** crear, editar, repetir orden → mensaje en español.
- [ ] Forzar un error en cualquier modal (p. ej. sin red al guardar) → el botón **no** se queda en
      "Guardando...".
- [ ] **Usuarios:** crear un juez → aparece **con su rol** a la primera. Cambiarle el rol,
      resetearle la contraseña (se muestra una sola vez), desactivarlo, reactivarlo.
- [ ] **Usuarios:** intentar eliminar a un juez con calificaciones → lo impide y sugiere desactivar.
- [ ] **Rondas de jueces:** crear ronda (etapa + retos + jueces), editarla, ver los nombres de los
      jueces en la tarjeta (inactivos en gris).
- [ ] **Calificaciones:** capturar puntos de retos; el leaderboard se actualiza en otra pestaña sin
      recargar. Ver "Puntos jueces".
- [ ] **Exportar** Excel y PDF; con la ronda abierta el PDF dice PRELIMINAR.
- [ ] **Cerrar ronda** con un juez incompleto → el aviso lista **solo a los que les falta**, con
      nombre y "X de N"; el botón dice "Cerrar de todos modos".
- [ ] **Cerrar etapa** → doble confirmación; después la etapa queda bloqueada y su ronda cerrada.
- [ ] Tableta vertical: el sidebar se colapsa a iconos, las tablas se pueden desplazar y los modales
      largos muestran el botón de guardar.

## 2. Juez (celular y tableta)

- [ ] Iniciar sesión → ve su ronda, su etapa y los participantes.
- [ ] Con varias rondas abiertas aparece el selector de ronda; con una sola, no.
- [ ] Tabs de reto: scroll horizontal y flechas; el contador por reto cuadra con lo capturado;
      "Solo pendientes" combina con la búsqueda.
- [ ] Capturar una nota con red → pasa a **sincronizado en el acto** (no tarda 15 s).
- [ ] **Modo avión real** (no solo DevTools): capturar 3 notas → estado "sin conexión". Recargar la
      página → las notas siguen ahí. Quitar el modo avión → se envían solas.
- [ ] Con notas sin enviar, el encargado cierra la ronda → el juez ve "bloqueado" y un aviso; no
      reintenta en bucle.
- [ ] **Tableta compartida:** el juez A deja notas sin enviar y sale; el juez B entra en la misma
      tableta → **no** ve las notas de A. A vuelve a entrar → sus notas siguen y se envían.
- [ ] El encargado cambia la edición activa → el juez recibe aviso y cambia de ronda.
- [ ] El juez **no** ve en ningún lado: puntos del encargado, notas de otros jueces, promedios.

## 3. Director (tableta y celular)

- [ ] **Promedios:** selector de ronda, ranking por promedio, exportar Excel/PDF.
- [ ] **Ranking:** reordenar con el dedo (mantener presionado) y con el ratón; la lista hace scroll
      con el dedo sin arrastrar por accidente. "Ordenar por promedio de esta ronda".
- [ ] **Títulos:** asignar tocando el slot (participante en turno + Siguiente/Anterior) y también
      arrastrando; reemplazar y quitar.
- [ ] La ronda elegida y el borrador se conservan al cambiar de pestaña.
- [ ] **Guardar con red lenta** (DevTools → Network → Slow 3G): mover algo mientras dice
      "Guardando…" → ese cambio queda **pendiente**, no se da por guardado.
- [ ] "Enviar al anunciador" solo se habilita con todos los títulos asignados y sin cambios
      pendientes. "Retirar" lo oculta del anunciador.
- [ ] Cerrar sesión con cambios sin guardar → avisa. Cerrar la pestaña → avisa el navegador.

## 4. Anunciador (laptop conectada al proyector)

- [ ] Sin envío del director → no se ve ningún título.
- [ ] **Orden:** reordenar arrastrando; se guarda; con el show empezado queda bloqueado.
- [ ] **Proyección:** pantalla completa sin header ni nombre de usuario; un título a la vez.
- [ ] Revelar con espacio, flecha derecha y **el presentador inalámbrico** del evento.
- [ ] El botón se oculta a los 4 s y vuelve al mover el ratón. ¿4 s es buen tiempo en el
      proyector real? Anotar.
- [ ] **Recargar a medio show** → retoma en el mismo título.
- [ ] Legibilidad desde el fondo del salón.

## 5. Concurrencia y carga

- [ ] Dos encargados en Calificaciones a la vez: los cambios de uno aparecen en el otro.
- [ ] El director edita títulos mientras el anunciador revela → anotar qué pasa en la proyección
      (decisión de producto pendiente: bloquear, avisar o dejar).
- [ ] **Todos los jueces del evento** califican a la vez durante 10 min, con el leaderboard abierto
      en otra pantalla → sin errores, sin notas perdidas.
- [ ] Navegar entre pantallas del encargado durante esa carga → el leaderboard no se pierde
      eventos (pendiente de §5.10: el canal realtime se rehace al navegar).

## 6. Seguridad (comprobación rápida en producción)

- [ ] Registro público cerrado: intentar registrarse responde "Signups not allowed".
- [ ] Un juez desactivado no puede iniciar sesión, y si ya tenía la sesión abierta deja de ver
      datos y de poder calificar en el acto.
