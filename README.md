# Back App Message

Backend modular para una aplicación de mensajería en tiempo (casi) real construido sobre Bun + Hono. Expone endpoints REST para autenticación, gestión de usuarios y sirve como base para módulos de chat y canales.

## Propósito del proyecto
- Unificar autenticación (Better Auth) y perfiles de usuario en un backend ligero.
- Proveer endpoints CRUD de usuarios listos para integrarse con un front-end React/Next.
- Servir como base extensible para funcionalidades de mensajería (canales, mensajes, presencia) apoyándose en Drizzle ORM y Neon/PostgreSQL.

## Características clave
1. **Autenticación Better Auth** expuesta mediante `/api/auth/*` y persistida en PostgreSQL.
2. **Gestión de usuarios + perfiles** con validaciones `zod` y capa `service/repository` (@src/modules/users/controllers/user.controller.ts#13-67).
3. **Infraestructura lista para canales y mensajes**, con esquemas Drizzle ya definidos (@src/db/schema/messages.entity.ts#1-23).
4. **Stack totalmente tipado** con TypeScript y Bun + TSX para DX rápida.

## Stack tecnológico
| Capa | Herramienta | Uso |
| --- | --- | --- |
| Runtime | [Bun](https://bun.sh) | Ejecución y gestor de paquetes.
| Framework HTTP | [Hono](https://hono.dev) | Ruteo y middlewares ligeros (@src/index.ts#1-15).
| Autenticación | [Better Auth](https://www.better-auth.com/docs) | Flujos auth y almacenamiento de sesiones (@src/lib/auth.ts#1-49).
| ORM | [Drizzle ORM](https://orm.drizzle.team) + drizzle-kit | Acceso tipado a PostgreSQL/Neon (@src/db/index.ts#1-5, @drizzle.config.ts#1-11).
| Validación | [Zod](https://zod.dev) | Esquemas DTO (`updateUserSchema`).
| Entorno | `dotenv` | Carga de variables locales.

## Arquitectura actual
```
src/
├─ index.ts                 # Bootstrap de Hono y montaje de módulos
├─ lib/auth.ts              # Configuración Better Auth + hooks
├─ db/                      # Configuración Drizzle + esquemas
└─ modules/
   ├─ users/                # Controller → Service → Repository
   └─ chat/ (en progreso)   # DTOs de canales
```

```mermaid
graph TD
    A[Cliente HTTP / Front-end] -->|REST| B[Hono App (/src/index.ts)]
    B --> C[Better Auth Router /api/auth/*]
    B --> D[UsersModule]
    D --> E[UserService]
    E --> F[UserRepository]
    C --> G[Drizzle Adapter]
    F --> H[(PostgreSQL/Neon)]
    G --> H
```

## Diagrama de secuencia (PATCH /api/users/:id)
```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as Hono Controller
    participant Service as UserService
    participant Repo as UserRepository
    participant DB as PostgreSQL

    Client->>API: PATCH /api/users/:id (JSON)
    API->>API: Validación zod (updateUserSchema)
    API->>Service: updateUser(id, dto)
    Service->>Repo: findById(id)
    Repo->>DB: SELECT user LEFT JOIN profile
    DB-->>Repo: Row
    Service->>Repo: update(id, dto)
    Repo->>DB: UPDATE user/profile
    DB-->>Repo: Updated row
    Repo-->>Service: Row + profile
    Service-->>API: UserWithProfile
    API-->>Client: 200 JSON | 404 if not found
```

## Instalación y ejecución
1. **Prerrequisitos**: Bun ≥ 1.1, PostgreSQL (o Neon Database URL).
2. **Variables de entorno**: cree `.env` con al menos:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/db"
   BETTER_AUTH_SECRET="<cadena aleatoria>"
   BETTER_AUTH_URL="http://localhost:3000/api/auth"
   ```
   *(Better Auth usa `BetterAuthOptions`; establezca los secretos según sus despliegues.)*
3. **Instalación de dependencias**:
   ```sh
   bun install
   ```
4. **Migraciones (opcional)**:
   ```sh
   bunx drizzle-kit generate
   bunx drizzle-kit migrate
   ```
5. **Correr en desarrollo**:
   ```sh
   bun run dev
   ```
   API base: `http://localhost:3000/api`.

## Documentación de endpoints

### Base URL
```
http://localhost:3000/api
```

### Autenticación (Better Auth)
- **Ruta**: `/api/auth/*`
- **Métodos**: `GET`/`POST` (según endpoint).
- Incluye registro, login email+password, sesiones, entre otros. Ver documentación oficial de Better Auth para el listado completo y payloads esperados.

### Usuarios (`/api/users`)
| Método | Ruta | Body | Respuesta exitosa | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/api/users` | — | `200 UserWithProfile[]` | Lista todos los usuarios con su perfil (@src/modules/users/controllers/user.controller.ts#13-17).
| GET | `/api/users/:id` | — | `200 UserWithProfile` | Busca un usuario por `id`. Devuelve `404` si no existe (@src/modules/users/controllers/user.controller.ts#19-55).
| PATCH | `/api/users/:id` | `UpdateUserDto` | `200 UserWithProfile` | Actualiza campos del usuario o perfil. Requiere al menos un campo válido; `400` en validación fallida (@src/modules/users/controllers/user.controller.ts#30-55, @src/modules/users/dtos/update-user.dto.ts#13-40).
| DELETE | `/api/users/:id` | — | `200 { message: "User deleted" }` | Elimina usuario y su perfil si existe. `404` si no se encuentra (@src/modules/users/controllers/user.controller.ts#57-65).

**Esquema `UpdateUserDto`** (@src/modules/users/dtos/update-user.dto.ts#3-40):
```ts
email?: string (email)
name?: string
image?: string | null (URL)
emailVerified?: boolean
profile?: {
  displayName?: string
  avatarUrl?: string | null (URL)
  bio?: string | null (<=500)
  age?: number | null (>=0)
  isOnline?: boolean
}
```
Si no se envía ningún campo, la API responde `400` con mensaje `Provide at least one property to update`.

### Estados HTTP esperados
- `200 OK`: Operación exitosa.
- `201 Created`: (reservado para futuros endpoints de creación).
- `400 Bad Request`: JSON inválido o violación de esquema `zod`.
- `404 Not Found`: Usuario inexistente.
- `500 Internal Server Error`: Error inesperado (consultar logs de Bun/Hono).

## Próximos pasos sugeridos
- Completar los controladores/repositorios del módulo `chat` para canales y mensajes.
- Añadir pruebas automatizadas para `UserService`.
- Documentar scripts específicos de despliegue (Docker, CI/CD) cuando estén disponibles.
