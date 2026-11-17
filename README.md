# Organizador

Toda tu vida, un solo sistema. Módulos: **Finanzas** y **Entrenamiento**.

Un solo link, sin cuentas ni configuración. Los datos se guardan en tu celular.

## Usarla

1. Abrí **https://ericnicolasperez.github.io/Organizador-de-vida/** en el celular.
2. Agregala a la pantalla de inicio (en iPhone: Compartir → *Agregar a inicio*; en Android: menú → *Instalar app*).
3. Listo. Funciona también sin señal.

## Copia de seguridad

Los datos viven solo en este dispositivo. En **Ajustes → Hacer copia** descargás un archivo con todo; con **Restaurar** lo cargás en otro celular. Hacé una copia cada tanto.

## Publicación (una sola vez)

La app se publica sola desde la rama `main` con GitHub Actions. La primera vez, en el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Desarrollo

```bash
pnpm install
pnpm dev
```

```bash
pnpm test
```

La versión anterior con nube (Next.js + Supabase) quedó en la rama `v1-supabase`.
