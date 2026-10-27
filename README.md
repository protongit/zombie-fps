# Calle Muerta — FPS 3D de apocalipsis zombi

Juego FPS en 3D para navegador, ambientado en un apocalipsis zombi. Recorres una
calle urbana en ruinas limpiando **5 focos de infección** —incluido un **distrito
helado**— hasta el encuentro final con **La Abominación**, un jefe con tres fases.

Dos formas de jugar: **Modo Historia** (con capítulos, radio, checkpoints y epílogo)
y **Supervivencia** (arcade puro), ambas con **4 niveles de dificultad** y una **ciudad
abierta** con avenidas, calles laterales y transversales para moverse con libertad.

Hecho con **Three.js**. La lógica del juego vive en un único `index.html`
(HTML + CSS + JS embebidos), con arte low-poly procedural y **assets CC0 de
[Kenney](https://kenney.nl)**: muebles, cofres, cajas y barriles en `assets/kenney/`.
Los zombis usan los **personajes animados** de Kenney (`Animated Characters
Survivors` y `Retro`) con sus skins, animaciones de reposo/carrera y variantes
por tipo. Three.js, los cargadores GLTF/FBX y las utilidades de esqueletos se
incluyen localmente en `lib/`, por lo que **funciona sin conexión**.

## Ejecutar

Necesita servirse por HTTP (usa módulos ES). Desde esta carpeta:

```bash
python3 -m http.server 8123
# o: npx serve -l 8123
```

Abre <http://localhost:8123/index.html>. También hay `run.sh`:

```bash
./run.sh
```

### Docker

Con Docker y Docker Compose instalados:

```bash
docker compose up -d --build
```

Abre <http://localhost:8123/>. Para usar otro puerto:

```bash
PORT=3000 docker compose up -d
```

Para detenerlo:

```bash
docker compose down
```

También puedes construir y ejecutar la imagen directamente:

```bash
docker build --load -t calle-muerta .
docker run -d --name calle-muerta -p 8123:8123 calle-muerta
```

## Controles

| Tecla | Acción |
|---|---|
| `WASD` | Moverse |
| Ratón | Apuntar (bloquea el puntero al empezar) |
| Click izquierdo | Disparar |
| **Click derecho** | **Apuntar con la mira (ADS)** |
| `1` / `2` / `3` / `4` / rueda | Cambiar de arma (solo las conseguidas) |
| `Shift` | Correr |
| `Espacio` | Saltar / **machacar para soltarte** de un agarre |
| `G` | Lanzar **pipa de humo** o **cóctel molotov** |
| `P` | Tomar **pastillas** (+40 de salud temporal) |
| **`E`** | **Abrir puertas, cofres y registrar muebles** |
| `H` | Usar **vendaje** |
| `J` / `K` / `L` | Poción de **velocidad / salto / invulnerabilidad** |
| **`I`** | **Abrir la mochila (8 huecos) y descartar objetos** |
| `ESC` | Pausa / cerrar paneles |

## Modos de juego

### Modo Historia
- **Prólogo** con mensajes de radio de «Eco», la voz que te guía.
- **5 capítulos + capítulo final**, cada uno con su título, objetivo narrativo y
  transmisiones de radio (efecto máquina de escribir) al entrar en cada foco.
- **Checkpoints**: al morir puedes **continuar desde el último capítulo superado**
  (con algo de munición de regalo) en lugar de empezar de cero.
- **Edificios accesibles**: varias casas tienen la puerta marcada con una lámpara.
  Acércate y pulsa **`E`** para abrirla. En **Supervivencia** las puertas están
  atrancadas y no se puede entrar.
- **Interiores con mobiliario Kenney**: mesas, sillas, camas, estanterías, armarios,
  alfombras, lámparas y cajas. Algunos muebles y todos los cofres son **registrables**.
- **Panel de botín**: al abrir un cofre o registrar un mueble se muestran el contenido
  y tu **mochila**. Puedes seleccionar botín, descartar objetos para hacer sitio y pulsar
  **Recoger/Intercambiar**. El resto se queda atrás.
- **Mochila limitada**: 8 huecos para armas, munición (1 por tipo) y consumibles
  (1 por unidad). El equipo inicial ocupa 4/8.
- **Epílogo** al derrotar al jefe.

### Supervivencia
- Modo arcade sin narrativa: limpia los focos y mata al jefe. Reintento desde el inicio.
- **Los edificios están atrancados**: no se puede entrar ni saquear interiores.

## Dificultad
Se elige en el menú principal y afecta a toda la partida:

| Nivel | Zombis | Vida zombi | Daño | Velocidad | Botín |
|---|---|---|---|---|---|
| **Fácil** | ×0,7 | ×0,7 | ×0,6 | ×0,85 | ×1,5 |
| **Normal** | ×1 | ×1 | ×1 | ×1 | ×1 |
| **Difícil** | ×1,3 | ×1,35 | ×1,45 | ×1,1 | ×0,85 |
| **Pesadilla** | ×1,6 | ×1,8 | ×1,9 | ×1,22 | ×0,7 |

Afecta también al jefe y a las oleadas que salen de los edificios.

## La ciudad
El mapa ya no es un pasillo: es una **ciudad abierta** de 84 m de ancho por 400 de largo.

- **Avenida principal** (32 m) con el centro despejado para combatir y esquivar.
- **Calles laterales** paralelas a la avenida, entre dos bandas de manzanas.
- **4 calles transversales** que cruzan toda la ciudad, con **localizaciones** en sus
  extremos: kioscos con toldo, barriles, coches aparcados y **botín** (munición,
  botiquines y munición de cohete).
- En modo historia, algunas localizaciones esconden **cofres**.
- No hay barreras entre focos: puedes recorrer la ciudad libremente. Cada foco se activa al entrar.

## Niveles y bucle de juego

Entras en un **foco de infección** y se activa su horda. No hay muros ni barreras:
puedes entrar, salir o rodear la zona, pero el foco no se completa hasta eliminar a
**toda su horda**.

1. **Foco 1 — Calle en ruinas.** Caminantes y un corredor.
2. **Foco 2 — El bloque.** Caminantes, corredores y un bruto.
3. **Foco 3 — Zona industrial.** Más brutos y corredores.
4. **Foco 4 — Distrito helado.** Ambiente gélido (nieve, hielo, niebla azul) y los
   **muertos congelados**.
5. **Foco 5 — Núcleo helado.** Más zombis y brutos helados y corredores.
6. **Arena final.** **La Abominación**, gélida, con 3 fases.

Los enemigos **no sueltan objetos**. El botín se consigue en cofres, cajas, interiores y alijos del mapa.

## Edificios, botín y consumibles

Dentro de los edificios puedes encontrar **cofres** y **muebles registrables**
(estanterías, armarios, cajas de suministros y camas). Al abrirlos aparece un panel
con **3-4 items** y tu mochila. Selecciona lo que quieras conservar; si no cabe,
marca objetos de la mochila para descartarlos y pulsa **Recoger/Intercambiar**.

La mochila tiene **8 huecos**: cada arma ocupa 1, cada tipo de munición 1 y cada
consumible 1 por unidad. Al recoger armas y munición se aplican automáticamente,
pero siguen ocupando su hueco. Puedes abrirla en cualquier momento con **`I`**.

Las **paredes y puertas bloquean** ataques, agarres, proyectiles y explosiones:
si te encierras en una casa, los enemigos de fuera no pueden hacerte daño.

| Item | Efecto |
|---|---|
| **Armas** | Desbloquean el **subfusil** o el **lanzacohetes** con munición. |
| **Munición** | Balas de pistola, cartuchos de escopeta, cargadores de subfusil y cohetes. |
| **Vendajes** | Se guardan en el inventario y curan **35 de salud** al pulsar `H`. |
| **Poción de velocidad** | +55 % de velocidad durante **14 s** (`J`). |
| **Poción de salto** | Salto un 50 % más alto durante **14 s** (`K`). |
| **Poción de invulnerabilidad** | Inmunidad total durante **9 s** (`L`). |

Los efectos activos se muestran en el HUD con su cuenta atrás.

## Ambiente y escenario
- **Iluminación mejorada**: tone mapping ACES, sombras suaves PCF con sol dinámico
  que sigue al jugador, luz de relleno, lámparas cálidas en los interiores y luces
  de puerta para localizar las casas accesibles.
- **Ciudad en llamas**: varios edificios arden (ventanas incandescentes, brasas y humo)
  y al acercarte van **soltando oleadas de zombis** por sus puertas.
- **Edificios helados**: en el distrito de nieve, edificios con ventanas gélidas y
  **niebla helada** emiten también **oleadas** de **zombis congelados** (helados, brutos
  helados y escupidores) mientras estés cerca.
- **Coches explosivos**: dejan de ser decorado para recibir daño; al recibir suficientes
  balas **explotan** (onda expansiva que daña a zombis y al jugador), quedan
  **carbonizados y ardiendo**, y pueden provocar **reacciones en cadena** con coches
  cercanos. En la plaza final hay coches que **el jefe usa como proyectil**.
- **Barriles explosivos**: se detonan con un par de balas; su explosión daña en área y
  **encadena** con otros barriles y coches cercanos. También hay barriles en la plaza,
  útiles contra el jefe.
- **Iluminación dinámica**: luz de fuego (naranja, parpadeante), luz gélida (cian) y
  fogonazo de explosión sobre el foco correspondiente más cercano.
- **Coches detallados**: carrocería, cabina, ventanas, faros, pilotos y ruedas; algunos
  quemados, otros de policía (con sirena) o taxi, y **nevados** en el distrito helado.
- **Obstáculos y cobertura**: contenedores, coches, barreras de hormigón, volquetes,
  sacos de arena y barriles; en el **distrito helado**, pilas de nieve y cristales de
  hielo; y cobertura extra en la plaza final.

## Enemigos

Personajes **animados de Kenney** con esqueleto, animaciones de **idle/carrera** y
skins CC0: camisetas de calavera, ropa oscura, franela y variantes pálidas. Cada
zombi clona su propio esqueleto, así que todos se mueven de forma independiente.
Los tipos se distinguen por **escala, tinte y accesorios**: tonos helados y brillo
azul (congelados), verde ácido (escupidores), tonos oscuros y mayor corpulencia
(brutos/tanque), corona de púas (jefe) y **lengua** (smoker). Si un asset no está
disponible, el juego vuelve automáticamente al modelo procedural de reserva.

| Tipo | Rasgos |
|---|---|
| **Caminante** | Lento, equilibrado. |
| **Corredor** | Rápido y frágil. |
| **Bruto** | Mucha vida y daño, lento. |
| **Zombi helado** | **Aura de frío**: te congela (ralentiza) si te acercas. Al morir estalla en **esquirlas de hielo**. |
| **Bruto helado** | Tanque gélido con aura de frío y estallido de hielo. |
| **Escupidor** | Ataca **a distancia** con proyectiles ácidos. |
| **La Abominación (jefe)** | Melé, invoca esbirros (helados incluidos), escupe ácido, golpea en área (**detonando barriles y coches**) y **lanza coches** al jugador. 3 fases. |

## Infectados especiales (estilo Left 4 Dead)
| Especial | Comportamiento |
|---|---|
| **Hunter** | Acecha agachado y **salta sobre ti**: te **inmoviliza** y te despedaza. Machaca `ESPACIO` para soltarte. |
| **Smoker** | Se mantiene a distancia y te **atrapa con la lengua**, arrastrándote hacia él. Máchaca `ESPACIO`. |
| **Boomer** | Panzón que **vomita bilis**: te ciega y **atrae una horda**. Explota en bilis si muere cerca. |
| **Charger** | **Embeste** en línea recta a toda velocidad (30 de daño y te aturde). |
| **Tank** | Minijefe enorme: 38 de daño por golpe y **lanza barriles o cajas** que encuentra por el mapa. Si no hay objetos cerca, solo ataca cuerpo a cuerpo. Aparece en Difícil/Pesadilla y en Supervivencia. |
| **Bruja** | Si te acercas o **le disparas**, se enfurece y **corre hacia ti a 9 m/s** con 60 de daño. Huye… o muere. |


## Director de IA
Un director dinamiza la partida: cuando la tensión sube, **lanza hordas** por tu espalda
y coloca **infectados especiales** fuera de tu campo de visión, con pausas entre ellas.
En **Supervivencia** y en las dificultades altas también suelta **Tanks**.

## Objetos (estilo Left 4 Dead)
| Objeto | Tecla | Efecto |
|---|---|---|
| **Pipa de humo** | `G` | Se lanza, **pita y atrae a todos los comunes** y al cabo de 4 s **explota** (220 de daño en área). |
| **Cóctel molotov** | `G` | Crea un **charco de fuego** 8 s que quema a los zombis (si no hay pipa, lanza el molotov). |
| **Pastillas** | `P` | +40 de **salud temporal** que se degrada con el tiempo y absorbe daño antes que la vida real. |

Los objetos se obtienen de **cofres, cajas, muebles de interiores y alijos** repartidos por la ciudad; los enemigos no sueltan nada.
Los cofres, cajas y muebles usan el panel de botín con mochila e intercambio.

## Estados del jugador
- **Agarrado** (Hunter/Smoker): no puedes moverte; **machaca `ESPACIO`** para liberarte.
- **Bilis** (Boomer): pantalla verde y horda a la caza.
- **Aturdido** (Charger/Bruja): te mueves muy lento unos instantes.
- **Salud temporal** (pastillas): se muestra en la barra y se degrada sola.

### Congelación
Cerca de los zombis helados sube tu **frío**: te ralentiza (55 % de velocidad) y se
muestra con una viñeta azul; al alejarte se descongela.

## Armas
Modelos procedurales detallados con **manos y antebrazos**, **apuntado (ADS)** con zoom
de FOV, **sway** amortiguado, retroceso y **fogonazo** con luz dinámica. Al apuntar
(clic derecho) el arma se centra bajo la mira para un apuntado estable.

| Arma | Tecla | Rasgos |
|---|---|---|
| **Pistola** | `1` | Automática, precisa, munición abundante. |
| **Escopeta** | `2` | 8 postas por disparo, devastadora de cerca. |
| **Subfusil** | `3` | Cadencia altísima, daño bajo por bala. Se consigue en cofres. |
| **Lanzacohetes** | `4` | Cohete con estela que **explota en área** (130 de daño). Se consigue en cofres. |

El subfusil y el lanzacohetes se obtienen abriendo **cofres** (modo historia) o con
botín de cohete; la rueda del ratón solo cicla las armas que llevas encima.

## Movimiento
- Los zombis **esquivan obstáculos**: si se quedan atascados, rodean lateralmente.
- Aceleración y velocidad del jugador mejoradas; los spawns comprueban que haya espacio libre.

- **Pistola** — automática, precisión media, mucha munición.
- **Escopeta** — 8 postas por disparo, devastadora de cerca, cadencia baja.

## Arquitectura (todo en `index.html`)

- `Sound` — audio procedural WebAudio (disparos, impactos, gruñidos, hielo).
- `loadKenneyAssets()` — carga los GLB de Kenney con `GLTFLoader`.
- `loadCharacterAssets()` — carga el modelo FBX, idle/run y las skins de los zombis con `FBXLoader` y `TextureLoader`.
- `buildMap()` / `addEnterableBuilding()` — calle, edificios, interiores, puertas y mobiliario.
- `doors` / `updateDoors()` / `interact()` — puertas animadas solo en modo historia.
- `inventoryItems()` / `invUsed()` / `discardInventoryItem()` — mochila de 8 huecos, armas/munición y consumo.
- `rollLoot()` / `openLoot()` / `openInventory()` / `collectLoot()` — panel de botín, intercambio y descarte.
- `hasLOS()` / `segmentWorldHit()` — paredes y puertas bloquean ataques, agarres y proyectiles.
- `furnitureLoot` / `makeChest()` — cofres y muebles registrables.
- `MOODS` / `updateMood()` — transición de bioma (niebla, luces, sol).
- `Snow` — nieve en partículas centrada en el jugador.
- `makeZombieModel()` / `makeSkinnedZombieModel()` / `updateZombies()` — clones de esqueleto, `AnimationMixer`, IA y habilidades.
- `ZOMBIE_BASE` / `zombieConfig()` — estadísticas y aspecto por tipo, con dificultad aplicada.
- `iceBurst()` — esquirlas de hielo al morir un zombi helado.
- `updateBoss()` — jefe por fases.
- `buildWeapons()` / `layoutWeapon()` — armas, ADS, sway, retroceso y fogonazo.
- `tryFire()` — hitscan con `Raycaster`, dispersión, trazadoras y partículas.
- `updateZones()` — activación de focos por entrada, oleadas y checkpoint.
- `updateThrownProps()` / `tankThrowObject()` — Tank lanzando barriles y cajas del mapa.
- `STORY` / `Comms` — guion del modo historia y sistema de radio con typewriter.

## Modos de QA (opcionales)

Parámetros de URL para pruebas automatizadas; no afectan al juego normal:

- `?autotest=1` — recorre las 5 zonas y el jefe y escribe el resultado en `#dbg`.
- `?stories=1` — arranca el modo historia, limpia el foco 1 y fuerza la muerte para
  comprobar el checkpoint.
- `?qa=z1..z5|plaza|boss` — coloca al jugador en una escena concreta (vida infinita).
- `&fire=1` / `&walk=1` / `&clear=1` — disparo automático / mantener `W` / limpiar horda.
- `&burn=1` — fuerza que todos los edificios urbanos estén ardiendo.
- `&frost=1` — fuerza que todos los edificios helados suelten zombis.
- `&car=1` — coloca la cámara frente a un coche.
- `&boom=1` — hace explotar el primer coche.
- `&barrel=1` — mira un barril y le dispara.
- `&throw=1` — el jefe arranca y lanza un coche.
- `&rocket=1` — equipa el lanzacohetes y dispara uno.
- `?diff=facil|normal|dificil|pesadilla` — fija la dificultad (QA).
- `?spec=hunter|smoker|boomer|charger|tank|witch|walker|runner|brute|frozen|icebrute|spitter` — genera un zombi concreto.
- `&grab=1` — fuerza el agarre del especial para probarlo.
- `&items=1` / `&throwpipe=1` / `&throwmolo=1` — objetos para probar.
- `&ads=1` — fuerza el apuntado (ADS) para inspección.
- `?inside=1` — arranca historia y entra en el primer edificio accesible.
- `&opendoor=1` — abre la puerta interior de la escena de `inside`.
- `&loot=1` — abre el botín de un cofre automáticamente.
- `&takefirst=1` — selecciona y recoge el primer item del panel de botín (QA).
- `&nolock=1` — no bloquea el puntero (útil para capturas/headless).

`window.__GAME__` expone `getState()`, `start(mode)`, `tp()`, `killAll()`, `hurt()`
y `autotest()`.

## Créditos

- [Three.js](https://threejs.org) — MIT. Incluye `GLTFLoader`, `FBXLoader`,
  `SkeletonUtils`, `NURBSCurve` y `fflate` localmente en `lib/`.
- [Kenney](https://kenney.nl) — *Furniture Kit*, *Survival Kit*,
  *Animated Characters Survivors* y *Animated Characters Retro*, licencia **CC0**.
  Los modelos, skins y la textura están en `assets/kenney/` con sus licencias originales.

## Estructura

```
zombie-fps/
├── index.html        # el juego completo
├── assets/kenney/    # props, personajes animados y skins CC0
├── lib/              # Three.js, GLTFLoader, FBXLoader, SkeletonUtils...
├── run.sh
└── README.md
```
