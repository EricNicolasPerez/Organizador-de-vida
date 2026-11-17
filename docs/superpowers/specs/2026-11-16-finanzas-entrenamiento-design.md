# Organizador de vida — Módulos Finanzas y Entrenamiento (v1)

Fecha: 2026-11-16

## Intención y por qué

El objetivo final es un organizador personal que reúna toda la vida en un solo sistema, al estilo de Atlas (@atlas.app8): hábitos, agenda, finanzas, estudios, entrenamiento y metas. Para no terminar con muchos módulos a medias, se construye por partes. Esta primera versión cubre **Finanzas** y **Entrenamiento**.

- **Finanzas:** el usuario maneja bien su dinero y se guía por cuánto tiene disponible, pero no lleva ningún registro. Quiere tener las cuentas al día de forma estructurada, sin esfuerzo.
- **Entrenamiento:** quiere organizar sus rutinas, saber qué hizo un día cualquiera y qué le toca hoy.

Al principio la usa el propio usuario. Más adelante la quiere **vender** a otros usuarios, así que la base (cuentas de usuario, datos en la nube, separación por usuario) tiene que estar preparada desde el día uno.

## Objetivos

1. Ver de un vistazo **cuánto dinero hay disponible**, sumando todas las cuentas.
2. Registrar un gasto o un ingreso en segundos desde el celular.
3. Ver en qué se fue la plata del mes, por categoría.
4. Armar rutinas de entrenamiento divididas en días (por ejemplo Día A, Día B, Día C).
5. Al abrir la app, ver **qué entrenamiento toca hoy**.
6. Registrar la sesión (ejercicios, series, repeticiones, peso) y consultar el historial por fecha: "¿qué hice el martes?".
7. Login con cuenta propia. Cada usuario ve solo sus datos.

## Fuera de alcance (v1)

- Hábitos, agenda, estudios y metas: son módulos futuros. Igual se diseña la navegación pensando en que se agreguen después.
- Pagos y suscripciones para vender la app. Llega cuando se decida vender.
- Conexión automática con bancos o billeteras.
- Presupuestos con límites por categoría, gráficos avanzados y progresión automática de pesos.
- Captura inteligente ("anotás y cae donde corresponde"). Es una idea para más adelante.

## Anti-objetivos (fallaría aunque "funcione")

- Que registrar un gasto lleve más de unos segundos o varios pasos. Si es engorroso, no se usa.
- Que obligue a armar un presupuesto o una configuración larga antes de servir para algo.
- Que se pierdan datos al cambiar de celular.
- Que el saldo disponible mostrado no coincida con la realidad, sin una forma fácil de corregirlo.

## Restricciones

- Se usa principalmente desde el celular y también desde la computadora. La interfaz se diseña primero para móvil y se puede instalar como app (PWA).
- Interfaz en español.
- Datos en la nube, con cuenta de usuario, preparados para muchos usuarios (aislamiento por usuario).
- El repositorio está vacío: se arranca de cero.

## Enfoques considerados

1. **App web + base de datos en la nube (Supabase) desde el inicio** — ELEGIDO. Tiene login y datos seguros desde el día uno, y está lista para sumar pagos cuando se quiera vender. A cambio, la preparación inicial es algo mayor y requiere una cuenta de Supabase.
2. **Todo guardado en el dispositivo.** Es lo más rápido, pero se pierden los datos con el celular y habría que rehacer la base para venderla. Descartado.
3. **Construirla con Lovable.** Muestra resultados muy rápido, pero deja menos control y es difícil de mantener cuando crecen los módulos. Descartado.

El usuario eligió el 1 porque la va a usar a diario y la quiere vender.

## Diseño funcional

### Cuenta y acceso
- Registro e inicio de sesión con email y contraseña (Supabase Auth).
- En v1 el registro está cerrado: solo el dueño tiene cuenta. El registro abierto, con confirmación de email y recuperación de contraseña, se activa al decidir vender. *(Decisión del builder.)*
- Cada fila de datos pertenece a un usuario. Las políticas de seguridad de la base (RLS) impiden ver datos ajenos.

### Inicio (panel)
Una pantalla con dos tarjetas:
- **Disponible:** el total de todas las cuentas, más lo gastado y lo ingresado en el mes.
- **Hoy te toca:** el próximo día de la rutina activa, con un botón para empezar.

La navegación inferior tiene: Inicio · Finanzas · Entrenamiento (con espacio para módulos futuros).

### Finanzas
- **Monedas:** pesos (ARS) y dólares (USD). Cada cuenta tiene una sola moneda. *(Decisión del usuario.)*
- **Cuentas:** dónde está la plata (por ejemplo Efectivo, Banco, Mercado Pago, Dólares). Cada una tiene una moneda, un tipo (**disponible** o **tarjeta de crédito**) y un saldo inicial. El saldo actual es el saldo inicial más los ingresos, menos los gastos, más o menos las transferencias.
- **Disponible por moneda:** el panel muestra el total en ARS y el total en USD por separado. Solo suma las cuentas de tipo disponible. No hay conversión entre monedas en v1. *(Decisión del builder: evita depender de una cotización.)*
- **Tarjetas de crédito** *(el usuario las usa)*:
  - Un gasto con tarjeta se registra el día de la compra y cuenta en el resumen mensual de gastos.
  - Ese gasto **no** baja el disponible: aumenta la deuda de la tarjeta. El panel muestra aparte "Debés en tarjetas: $X".
  - **Pagar la tarjeta** es una transferencia de una cuenta disponible a la tarjeta. Baja el disponible y la deuda, y **no** cuenta como gasto (así no se cuenta dos veces).
  - Una tarjeta tiene moneda ARS en v1. Los consumos en dólares con tarjeta quedan para más adelante. *(Decisión del builder.)*
- **Movimientos:** gasto, ingreso o transferencia entre cuentas. Cada uno tiene monto, cuenta, categoría (no aplica a transferencias), fecha (por defecto hoy) y una nota opcional. Una transferencia entre cuentas de distinta moneda (comprar o vender dólares) guarda los dos montos: el que sale y el que entra.
- **Registro rápido:** un botón "+" siempre visible abre un formulario corto. Primero se escribe el monto y se elige gasto o ingreso; la cuenta y la categoría vienen precargadas con la última usada.
- **Categorías:** vienen precargadas (Comida, Transporte, Casa, Servicios, Salud, Ocio, Compras, Otros; para ingresos, Sueldo y Otros) y se pueden editar.
- **Resumen mensual:** separado por moneda; total de ingresos y gastos, el balance, y gastos por categoría en barras simples. Se puede navegar entre meses.
- **Ajuste de saldo:** si el saldo de la app no coincide con la realidad, el usuario ingresa el saldo real y se crea un movimiento de ajuste por la diferencia.
- **Lista de movimientos:** filtrable por mes y cuenta. Cada movimiento se puede editar y borrar.

### Entrenamiento
- **Ejercicios:** una biblioteca propia del usuario, solo con nombre y un grupo muscular opcional. Se pueden crear al vuelo mientras se arma una rutina.
- **Rutinas:** tienen nombre y una lista ordenada de días (por ejemplo "Día A – Pecho/Tríceps"). Cada día tiene ejercicios ordenados, con series y repeticiones objetivo, y peso de referencia opcional. Solo una rutina está activa a la vez.
- **Qué toca hoy:** la rutina rota. El día que toca es el siguiente al último registrado en la rutina activa; después del último día vuelve al primero. Si no hay sesiones, toca el primer día. El usuario puede elegir otro día manualmente.
- **Registrar sesión:** se parte del día que toca, con los ejercicios precargados y los valores de la última vez como referencia. Se pueden agregar o quitar series y ejercicios, y la sesión se guarda con su fecha.
  - Cada serie admite repeticiones y peso, o tiempo o distancia (por ejemplo plancha o cardio). Cada ejercicio indica qué tipo de medida usa. *(Decisión del builder.)*
- **Sin señal** *(decisión del usuario)*: mientras se carga, la sesión en curso se guarda en el celular, así no se pierde aunque se corte la señal o se cierre la app. Se sube a la nube al tocar "Terminar". Si al terminar no hay conexión, queda pendiente y se reintenta sola. El resto de la app requiere conexión en v1.
- **Historial:** un calendario o lista por fecha. Al tocar un día se ve la sesión completa.

## Decisiones de cómo construirlo

- **Del usuario:** app web con Supabase (base de datos Postgres + autenticación) desde el inicio.
- **Del builder (propuestas, se pueden corregir):**
  - Next.js (App Router) + TypeScript + Tailwind CSS, instalable como PWA.
  - Hosting en Vercel.
  - Montos guardados como números exactos (`numeric`), nunca como decimales de punto flotante.

## Queda en manos del builder

- El esquema exacto de las tablas, los nombres y las migraciones.
- El estilo visual: simple, oscuro o claro, fácil de leer en el celular.
- La estrategia de pruebas.
- Los detalles de la PWA (íconos, manifest).
