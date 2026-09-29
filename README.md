# Todópolis · la ciudad 3D

Ciudad abierta en 3D (estilo neón y glassmorphism) donde cada local es una
categoría de [todopolis.online](https://todopolis.online). Se recorre a pie o
en carro, se entra a las tiendas, se ven los productos reales en vitrinas y se
pide sin salir del juego, con el mismo formulario de contraentrega de la tienda.

## Correr en local

```bash
npm install
cp .env.example .env.local   # y llena las variables
npm run dev                  # http://localhost:3000
```

Sin red hacia Sanity, `MOCK_CATALOG=1` usa un catálogo de prueba (nunca en producción).

`?calidad=alta` o `?calidad=baja` en la URL fuerza la calidad gráfica; por
defecto los teléfonos van en baja (sin bloom ni antialiasing).

## Desplegar en Vercel

1. Crear un proyecto nuevo en Vercel desde este repo (framework: Next.js).
2. Variables de entorno, copiadas del proyecto `todopolis-online`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   Sin ellas la ciudad funciona, pero el botón de confirmar pedido responde
   «Los pedidos desde la ciudad aún no están activos».
3. (Opcional) Dominio: `ciudad.todopolis.online`.

## Cómo se conecta con la tienda

| Qué | De dónde |
|---|---|
| Productos, precios, fotos, variantes, combos | Sanity `whkjmhyp/production` (dataset público, sin token) |
| Pedidos | Tabla `orders` de Supabase, igual que `app/actions/create-order.ts` de la tienda |
| WhatsApp | `storeSettings.whatsappPhone` de Sanity |

Los pedidos del juego llegan con `utm_source = juego-todopolis`,
`utm_medium = juego` y `utm_content = <id de la tienda>`, para medir cuánto
vende la ciudad y qué local convierte.

El precio **siempre** se recalcula en el servidor desde Sanity
(`lib/order-pricing.ts`): el navegador solo manda el producto, la variante y la
cantidad.

### Archivos copiados de todopolis.online

Se copiaron tal cual y hay que mantenerlos al día si cambian allá:

- `lib/checkout/delivery.ts` (+ test) — validación de datos de entrega
- `lib/colombia/divipola.ts` — departamentos y municipios
- `lib/quantity-offers.ts` (+ test) — combos por cantidad
- `lib/whatsapp.ts`, `lib/categories.ts`, `lib/adult-policy.ts`

## Estructura

```
app/api/catalog   catálogo para las vitrinas (Sanity, cache 10 min)
app/api/product   detalle de un producto (fotos, variantes, combos)
app/api/img       proxy de fotos (WebGL necesita mismo origen)
app/api/order     crea el pedido en Supabase
game/lib/city.ts  plano de la ciudad: distritos, tiendas, calles, carros
game/scene/       3D: ciudad, tiendas, interiores, jugador, carros, tráfico
game/hud/         interfaz: minimapa, mapa y taxi, ficha, checkout, asesor
```

Para agregar o mover una tienda basta editar `STORES` en `game/lib/city.ts`.

## Controles

W A S D para moverse, Shift corre, Espacio salta (y frena en el carro), el ratón
mira, E interactúa, F sube o baja del carro, M abre el mapa con taxi. En el
celular: joystick a la izquierda, deslizar a la derecha para mirar, y botones de
acción.

## Pruebas

```bash
npm run typecheck
npm test
```
