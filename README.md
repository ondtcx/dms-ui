# DMS Frontend

Aplicación web del sistema documental. Consume la API del backend y expone la experiencia operativa para usuarios autenticados.

## Stack

- Next.js 15
- React 19
- Tailwind CSS 4
- TanStack Query
- Axios
- React Hook Form

## Áreas principales

- `app/auth/` — login y recuperación
- `app/dashboard/` — operación principal
- `components/` — componentes de UI por dominio
- `lib/services/` — servicios HTTP hacia la API
- `lib/contexts/` — estado compartido y contexto
- `middleware.ts` — protección de rutas y redirecciones básicas

## Configuración

Instala dependencias:

```bash
npm install
```

Crea `.env.local` con al menos:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Desarrollo

```bash
npm run dev
```

Aplicación disponible en `http://localhost:3000`.

## Scripts útiles

- `npm run dev`
- `npm run test`
- `npm run test:coverage`
- `npm run lint`

## Notas de arquitectura

- El control de acceso del cliente mejora navegación y UX, pero la autorización real debe validarse siempre en backend.
- El dashboard ya incluye áreas para documentos, plantillas, workflows, reportes, usuarios, categorías, secciones, departamentos, notificaciones, transferencias, solicitudes, papelera, archivo y ajustes.
- La documentación general del sistema está en `../docs/`.
