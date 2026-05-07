# Instagram Relationship Intelligence Dashboard

Herramienta local para revisar tu relación con cuentas de Instagram.

La idea es ayudarte a entender mejor a quién sigues, quién no te sigue de vuelta y qué cuentas merece la pena revisar manualmente.

Esto **no es un bot de unfollow**.

No hace unfollow automático, no pulsa botones por ti y no realiza acciones ocultas en Instagram.

## Qué Puedes Hacer

- Leer tu lista de seguidores.
- Leer tu lista de seguidos.
- Detectar cuentas que sigues pero no te siguen de vuelta.
- Importar listas desde CSV o TXT.
- Revisar cuentas en una tabla.
- Marcar cuentas como `Keep` para no tocarlas.
- Marcar cuentas como `Review` para revisarlas más tarde.
- Analizar manualmente un perfil abierto.
- Usar un modo opcional más preciso llamado `Internal read-only scan`.
- Ver señales de inteligencia relacional: `Strength`, `Ghost` y `Gravity`.
- Guardar snapshots para comparar cambios con el tiempo.
- Ver el siguiente candidato recomendado para revisar.
- Guardar todo de forma local en tu navegador.

## Qué No Hace

- No hace unfollow automático.
- No sigue cuentas.
- No manda mensajes.
- No da likes.
- No comenta.
- No hace acciones en segundo plano.
- No intenta crecer cuentas ni automatizar Instagram.

## Instalación

Primero instala las dependencias:

```bash
npm install
```

Para arrancar el entorno local:

```bash
npm run dev
```

Abre:

```txt
http://127.0.0.1:5173/
```

Para crear el archivo que se pega en Instagram:

```bash
npm run build
```

El archivo final queda aquí:

```txt
dist/igrid.injected.js
```

## Cómo Usarlo en Instagram

1. Ejecuta:

```bash
npm run build
```

2. Abre Instagram Web en Chrome.

3. Abre la consola del navegador:

```txt
Cmd + Option + J
```

4. Copia el contenido de:

```txt
dist/igrid.injected.js
```

5. Pégalo en la consola de Instagram y pulsa Enter.

6. Aparecerá un panel flotante.

## Flujo Recomendado

Instagram suele mostrar primero seguidores y luego seguidos. Por eso el orden recomendado es:

1. Abre manualmente tu lista de seguidores.
2. Pulsa `Scrape followers`.
3. Espera a que termine.
4. Abre manualmente tu lista de seguidos.
5. Pulsa `Scrape following`.
6. Revisa la tabla de `Non-followbacks`.

Si sabes tus totales, escríbelos antes:

```txt
Expected followers: número de seguidores
Expected following: número de seguidos
```

Ejemplo:

```txt
Expected followers: 4192
Expected following: 2952
```

Esto ayuda a saber si la lectura está completa o si faltan cuentas.

## Botones Principales

`Scrape followers`

Lee la lista de seguidores desde la ventana/modal abierta en Instagram.

`Scrape following`

Lee la lista de cuentas que sigues desde la ventana/modal abierta en Instagram.

`Internal read-only scan`

Modo opcional más preciso. Lee tu lista de seguidos usando una llamada interna de Instagram Web y detecta si cada cuenta te sigue de vuelta cuando Instagram devuelve ese dato.

No hace unfollow. Solo lee.

`Import followers`

Importa seguidores desde un archivo CSV o TXT.

`Import following`

Importa seguidos desde un archivo CSV o TXT.

`Analyze current profile`

Lee datos visibles del perfil que tengas abierto manualmente:

- posts
- followers
- following
- bio
- link externo
- si es privado
- si está verificado
- foto de perfil

Sirve para mejorar las puntuaciones.

`Stop`

Pausa el proceso actual.

`Help`

Muestra ayuda dentro del panel.

`Hide`

Oculta el panel. Aparece un botón pequeño `IG` para volver a abrirlo.

También puedes mover el panel arrastrando desde la cabecera.

## Importar CSV o TXT

Puedes importar listas sin tener Instagram abierto.

Formato simple:

```txt
lilbieber
@instagram
https://www.instagram.com/natgeo/
```

También acepta CSV con columnas como:

```csv
username,full_name
lilbieber,Justin Bieber
instagram,Instagram
natgeo,National Geographic
```

Columnas reconocidas:

```txt
username
user_name
handle
profile
profile_url
url
account
```

## Qué Significan las Puntuaciones

Las puntuaciones son ayudas para revisar, no verdades absolutas.

### Priority

Indica qué cuentas podrían merecer revisión antes.

Sube si:

- no te sigue de vuelta
- parece sospechosa
- tiene bajo ratio followers/following
- está marcada como `Review`

Baja si:

- te sigue de vuelta
- está en `Keep`
- lleva tiempo conocida localmente

### Bot

Indica probabilidad aproximada de cuenta sospechosa.

Puede subir por señales como:

- usuario con muchos números
- foto de perfil por defecto
- pocos posts
- pocos followers
- sigue a muchísima gente
- bio vacía
- link externo sospechoso

Puede bajar si:

- es cuenta verificada
- parece una cuenta privada normal

### Keep

Indica cuánto conviene proteger esa cuenta de una revisión agresiva.

Sube si:

- te sigue de vuelta
- está en whitelist
- es verificada
- es privada
- lleva tiempo conocida localmente

### Strength

Mide fuerza de relación.

Sube si:

- te sigue de vuelta
- está en `Keep`
- es una cuenta verificada
- tiene valor de creador
- lleva tiempo conocida localmente

### Ghost

Mide si una cuenta parece una relación muerta o de bajo retorno social.

Sube si:

- no te sigue de vuelta
- lleva mucho tiempo en tus seguidos
- tiene baja fuerza de relación
- tiene bajo valor social
- parece inactiva o sospechosa

### Gravity

Mide el valor de una cuenta dentro de tu ecosistema social.

Sube si:

- es verificada
- tiene audiencia relevante
- tiene buen ratio followers/following
- tiene presencia externa
- aporta valor de creador o red

## Cola de Revisión

El panel muestra un bloque llamado `Next review`.

Ese bloque intenta responder:

```txt
cuál es la siguiente cuenta que tiene más sentido revisar
```

La recomendación combina:

- Priority
- Ghost
- Bot
- Strength
- Gravity
- whitelist/review manual
- confianza de los datos disponibles

La acción sugerida puede ser:

```txt
preserve
review
analyze profile
monitor
```

## Snapshots

El botón `Save snapshot` guarda una foto local del estado actual.

Guarda:

- número de seguidores
- número de seguidos
- usernames de seguidores
- usernames de seguidos
- número de non-followbacks
- fecha

Cuando guardas más de un snapshot, el panel puede mostrar:

- nuevos seguidos
- seguidos eliminados
- nuevos followers
- followers perdidos
- cambio en non-followbacks

## Antigüedad

La columna `Known` no significa “desde cuándo sigues a esa cuenta” exactamente.

Significa:

```txt
desde cuándo esta herramienta vio esa cuenta por primera vez en tus datos locales
```

Con varios escaneos en el tiempo se vuelve útil para saber qué cuentas son nuevas o antiguas.

## Modo Internal Read-Only

Este modo es opcional.

Usa Instagram Web estando tú logueado y hace peticiones de lectura a un endpoint interno de Instagram.

Ventajas:

- no depende del scroll
- suele ser más preciso
- puede obtener `followsMe`
- detecta non-followbacks sin comparar dos listas completas

Limitaciones:

- requiere estar logueado en Instagram Web
- depende de detalles internos de Instagram
- Instagram podría cambiarlo y romperlo
- no es una API oficial pública

Reglas de seguridad de este modo:

- solo hace peticiones `GET`
- no hace unfollow
- no hace `POST`
- no pulsa botones
- no actúa en segundo plano

## Datos Locales

Todo se guarda en `localStorage` del navegador, bajo esta clave:

```txt
igrid.phase1.state
```

Se guardan:

- seguidores
- seguidos
- whitelist
- review list
- totales esperados
- análisis de perfiles
- fechas de lectura
- resultados del modo interno
- snapshots históricos
- cola de revisión

## Comandos de Consola

También puedes controlar la herramienta desde la consola:

```js
window.IGRID.show()
window.IGRID.hide()
window.IGRID.scrape("followers")
window.IGRID.scrape("following")
window.IGRID.scrapeInternalFollowing()
window.IGRID.stop()
window.IGRID.exportData()
window.IGRID.clearData()
```

## Estructura del Proyecto

```txt
src/
  core/          inicio de la app y API de consola
  scraper/       lectura DOM y modo interno read-only
  parser/        parsers de Instagram, perfiles e importaciones
  analysis/      comparación followers/following
                 motores de relación, ghost, gravity, snapshots y review queue
  scoring/       cálculo de puntuaciones
  heuristics/    señales simples para detectar patrones
  safety/        reglas y mensajes de seguridad
  ui/            dashboard y tabla
  storage/       guardado local
  utils/         utilidades
  types/         tipos TypeScript
```
