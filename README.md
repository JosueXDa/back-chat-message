# Back App Message

Backend modular para una aplicación de mensajería en tiempo real desplegado en **Cloudflare Workers**. Construido con Hono, Drizzle ORM y Cloudflare Durable Objects. Expone una API REST completa para autenticación, usuarios, canales, hilos (threads), mensajes y uploads, con soporte de WebSocket en tiempo real basado en la arquitectura de Durable Objects.

---

## Tabla de contenidos

- [Back App Message](#back-app-message)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Stack tecnológico](#stack-tecnológico)
  - [Arquitectura general](#arquitectura-general)
  - [Durable Objects](#durable-objects)
    - [`UserSession` — uno por usuario autenticado](#usersession--uno-por-usuario-autenticado)
    - [`ChatThread` — uno por thread de conversación](#chatthread--uno-por-thread-de-conversación)
    - [Bindings (`wrangler.jsonc`)](#bindings-wranglerjsonc)
  - [WebSocket — flujo en tiempo real](#websocket--flujo-en-tiempo-real)
  - [Instalación y configuración local](#instalación-y-configuración-local)
    - [Prerrequisitos](#prerrequisitos)
    - [Pasos](#pasos)
  - [Despliegue en Cloudflare Workers](#despliegue-en-cloudflare-workers)
  - [Variables de entorno](#variables-de-entorno)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Esquema de base de datos](#esquema-de-base-de-datos)
  - [Documentación de la API](#documentación-de-la-api)
    - [Base URL](#base-url)
    - [Autenticación — `/api/auth` (Better Auth)](#autenticación--apiauth-better-auth)
    - [Usuarios — `/api/users`](#usuarios--apiusers)
    - [Canales — `/api/channels`](#canales--apichannels)
    - [Miembros de canal — `/api/members`](#miembros-de-canal--apimembers)
    - [Threads — `/api/threads`](#threads--apithreads)
    - [Mensajes — `/api/messages`](#mensajes--apimessages)
    - [Uploads — `/api/uploads`](#uploads--apiuploads)
    - [WebSocket — `/ws`](#websocket--ws)
      - [Eventos cliente → servidor](#eventos-cliente--servidor)
      - [Confirmaciones servidor → cliente](#confirmaciones-servidor--cliente)
      - [Eventos de push servidor → cliente](#eventos-de-push-servidor--cliente)
  - [Módulos](#módulos)
    - [Composition Root](#composition-root)
  - [Códigos de estado HTTP](#códigos-de-estado-http)
  - [Scripts disponibles](#scripts-disponibles)

---

## Stack tecnológico

| Capa | Herramienta | Versión | Uso |
|---|---|---|---|
| Runtime / Deploy | [Cloudflare Workers](https://workers.cloudflare.com) | `compatibility_date: 2026-02-19` | Ejecución serverless en el edge |
| Framework HTTP | [Hono](https://hono.dev) | `^4.10.6` | Ruteo, middlewares y manejo de peticiones |
| Autenticación | [Better Auth](https://www.better-auth.com) | `^1.4.1` | Sesiones, OAuth (GitHub / Google), email+password |
| ORM | [Drizzle ORM](https://orm.drizzle.team) + drizzle-kit | `^0.44.7` | Acceso tipado a PostgreSQL/Neon |
| Base de datos | [Neon (serverless PostgreSQL)](https://neon.tech) | `@neondatabase/serverless ^1.0.2` | Almacenamiento persistente |
| Tiempo real | Cloudflare Durable Objects | — | WebSocket persistente + broadcast |
| Storage | Cloudflare R2 / AWS S3 compat. | `@aws-sdk/client-s3 ^3.958.0` | Almacenamiento de archivos |
| Validación | [Zod](https://zod.dev) | `^4.1.13` | Esquemas DTO |
| Dev local | [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | `^3.114.0` | Emulación local y deploy |
| Empaquetado local | [Bun](https://bun.sh) | — | Gestión de paquetes y dev con `--hot` |

---

## Arquitectura general

```mermaid
graph TD
    Cliente(["Cliente HTTP / WS"])

    subgraph CF["Cloudflare Workers Edge"]
        Hono["Hono App\nsrc/index.ts"]

        subgraph Routes["Rutas REST"]
            R1["/api/auth → Better Auth"]
            R2["/api/users → UsersModule"]
            R3["/api/channels → ChannelModule"]
            R4["/api/members → MemberAccessModule"]
            R5["/api/threads → ThreadModule"]
            R6["/api/messages → MessageModule"]
            R7["/api/uploads → UploadModule"]
        end

        subgraph DOs["Durable Objects"]
            US["UserSession DO\n(1 por usuario)"]
            CT["ChatThread DO\n(1 por thread)"]
        end
    end

    DB[("Neon / PostgreSQL\nusers · channels\nthreads · messages")]

    Cliente -->|HTTP| Hono
    Cliente -->|WebSocket /ws| US
    Hono --> Routes
    Hono --> US
    US <-->|subscribe / unsubscribe| CT
    CT -->|POST /send| US
    Routes --> DB
```

Cada módulo sigue el patrón **Controller → Service → Repository**:

```
src/modules/<modulo>/
  ├── controllers/    ← Hono routes, validación HTTP, auth middleware
  ├── services/       ← Lógica de negocio
  ├── repositories/   ← Acceso a BD (interface + implementación Drizzle)
  ├── dtos/           ← Esquemas Zod de entrada/salida
  └── entities/       ← Tipos TypeScript del dominio
```

---

## Durable Objects

El sistema de tiempo real se implementa con dos Durable Objects registrados en `wrangler.jsonc`:

### `UserSession` — uno por usuario autenticado

- Acepta la conexión WebSocket larga vía **Hibernation API** (el DO puede dormir cuando el cliente está inactivo, reduciendo el costo en CPU).
- El estado de suscripción del usuario a threads (`subscribedThreads`) se serializa en el adjunto del WebSocket (`ws.serializeAttachment`) para sobrevivir a hibernaciones.
- Recibe peticiones HTTP internas `POST /send` desde `ChatThread` DO y reenvía el payload JSON a todos los WebSockets abiertos del usuario.
- **Eventos del cliente aceptados:**
  - `JOIN_THREAD` — llama a `POST /subscribe` en el `ChatThread` DO indicado
  - `LEAVE_THREAD` — llama a `POST /unsubscribe` en el `ChatThread` DO
- Al cerrarse la conexión (`webSocketClose`), cancela todas las suscripciones activas automáticamente.

### `ChatThread` — uno por thread de conversación

- Mantiene el conjunto de `subscribedUserIds` en KV storage del DO (persistido entre reinicios).
- Acepta peticiones HTTP internas:
  - `POST /subscribe` — añade un userId al set de suscriptores
  - `POST /unsubscribe` — elimina un userId
  - `POST /broadcast-message` — serializa el payload y lo entrega a cada `UserSession` DO via `Promise.allSettled`

### Bindings (`wrangler.jsonc`)

```jsonc
"durable_objects": {
  "bindings": [
    { "name": "UserSession", "class_name": "UserSession" },
    { "name": "ChatThread",  "class_name": "ChatThread"  }
  ]
},
"migrations": [{ "tag": "v1", "new_sqlite_classes": ["UserSession", "ChatThread"] }]
```

---

## WebSocket — flujo en tiempo real

```mermaid
sequenceDiagram
    participant C as Cliente
    participant W as Worker (Hono)
    participant US as UserSession DO
    participant CT as ChatThread DO
    participant DB as Neon DB

    C->>W: GET /ws (sesión válida)
    W->>US: Delegar upgrade WebSocket
    US-->>C: 101 Switching Protocols

    C->>US: { type: "JOIN_THREAD", threadId }
    US->>CT: POST /subscribe { userId }
    CT-->>US: 200 subscribed
    US-->>C: { type: "JOINED_THREAD", threadId }

    C->>W: POST /api/messages (REST + auth)
    W->>DB: createMessage()
    DB-->>W: message guardado
    W->>CT: POST /broadcast-message { type: "NEW_MESSAGE", payload }
    CT->>US: POST /send { type: "NEW_MESSAGE", payload }
    US-->>C: { type: "NEW_MESSAGE", payload completo }
    W-->>C: 201 Created { id, threadId, ... }

    C->>US: { type: "LEAVE_THREAD", threadId }
    US->>CT: POST /unsubscribe { userId }
    CT-->>US: 200 unsubscribed
    US-->>C: { type: "LEFT_THREAD", threadId }
```

**Puntos clave:**
- El WebSocket se establece y mantiene completamente dentro del `UserSession` DO con Hibernation API.
- Los mensajes se crean vía REST (`POST /api/messages`). El servicio hace el broadcast al `ChatThread` DO inmediatamente tras persistir en BD.
- El payload `NEW_MESSAGE` incluye el mensaje completo con datos del sender (`MessageWithSender`).
- Al desconectarse, el DO limpia todas las suscripciones activas en `webSocketClose`.

---

## Instalación y configuración local

### Prerrequisitos

- **Bun** ≥ 1.1 — [instalar](https://bun.sh)
- **Cuenta Cloudflare** con Workers habilitado
- **Neon Database** (o PostgreSQL compatible)

### Pasos

```bash
# 1. Clonar
git clone <url-del-repositorio>
cd back-chat-message

# 2. Instalar dependencias
bun install

# 3. Crear .dev.vars con las variables de entorno (ver sección Variables de entorno)

# 4. Ejecutar migraciones en base de datos
bunx drizzle-kit push

# 5. Iniciar servidor local (emula Workers + Durable Objects)
bun run cf:dev
```

> `bun run dev` usa `bun --hot src/index.ts` y es útil para iterar rápido, pero **no emula los Durable Objects**. Para probar WebSockets usa siempre `bun run cf:dev`.

---

## Despliegue en Cloudflare Workers

```bash
# Generar tipos de bindings (recomendado después de cambiar wrangler.jsonc)
bun run cf:types

# Desplegar
bun run cf:deploy
```

`wrangler deploy` empaqueta `src/index.ts`, sube el Worker y registra los Durable Objects según `wrangler.jsonc`.

---

## Variables de entorno

Archivo `.dev.vars` para desarrollo local; **Secrets** en el dashboard de Cloudflare para producción.

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL/Neon (`postgresql://user:pass@host/db`) |
| `BETTER_AUTH_SECRET` | Secreto aleatorio para Better Auth (≥ 32 chars) |
| `BETTER_AUTH_URL` | URL pública del backend (`https://<worker>.workers.dev/api/auth`) |
| `GITHUB_CLIENT_ID` | OAuth GitHub — Client ID |
| `GITHUB_CLIENT_SECRET` | OAuth GitHub — Client Secret |
| `GOOGLE_CLIENT_ID` | OAuth Google — Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth Google — Client Secret |
| `CORS_ORIGIN` | Origen permitido (`http://localhost:8081` en dev) |
| `R2_ACCOUNT_ID` | Cloudflare Account ID para R2 |
| `R2_ACCESS_KEY_ID` | Access Key compatible S3/R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Key compatible S3/R2 |
| `R2_BUCKET_NAME` | Nombre del bucket R2 |
| `R2_PUBLIC_URL` | URL pública del bucket |

**Generar secreto seguro:**
```bash
bun run -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Estructura del proyecto

```
back-chat-message/
├── wrangler.jsonc              # Configuración Cloudflare Workers + DOs
├── drizzle.config.ts           # Configuración Drizzle Kit
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                # Bootstrap: Composition Root, mount de rutas
│   ├── db/
│   │   ├── index.ts            # Instancia Drizzle + @neondatabase/serverless
│   │   ├── schema/             # Entidades Drizzle por tabla
│   │   └── migrations/         # SQL generado por drizzle-kit
│   ├── durable-objects/
│   │   ├── types.ts            # Interface Env (bindings Cloudflare Workers)
│   │   ├── user-session.do.ts  # DO: WebSocket por usuario (Hibernation API)
│   │   └── chat-thread.do.ts   # DO: Gestión de suscriptores + broadcast
│   ├── lib/
│   │   ├── auth.ts             # Configuración Better Auth (OAuth, sesiones)
│   │   └── r2.ts               # Cliente AWS SDK S3 para R2 + constantes
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # requireAuth — extrae y valida sesión Better Auth
│   │   └── index.ts
│   └── modules/
│       ├── auth/               # Proxy de rutas a Better Auth
│       ├── users/              # CRUD usuarios + perfiles
│       ├── channels/           # CRUD canales
│       ├── member-access/      # Membresías + roles + AuthorizationService
│       ├── threads/            # CRUD threads + archive/unarchive
│       ├── messages/           # CRUD mensajes + broadcast vía ChatThread DO
│       └── uploads/            # Upload directo a R2 (FormData)
└── docs/
    ├── ARCHITECTURAL_AUDIT.md
    ├── chat-architecture-diagram.md
    └── websocket-architecture-diagram.md
```

---

## Esquema de base de datos

```
users
  id (text PK) · name · email · emailVerified · image · createdAt · updatedAt

profile
  id (uuid PK) · userId (FK→users) · displayName · avatarUrl · bannerUrl
  bio · age · isOnline · createdAt · updatedAt

channels
  id (uuid PK) · name · description · isPrivate · imageUrl · bannerUrl
  category · ownerId (FK→users) · createdAt

channel_members
  id (uuid PK) · channelId (FK→channels) · userId (FK→users)
  role (admin|moderator|member) · joinedAt

threads
  id (uuid PK) · channelId (FK→channels CASCADE) · name · description
  createdBy (FK→users) · isArchived · createdAt · updatedAt

messages
  id (uuid PK) · senderId (FK→users) · threadId (FK→threads CASCADE)
  content (text) · attachments (jsonb[]) · createdAt
```

> `messages.attachments` es un array JSONB de objetos `{ id, url, filename, mimeType, size, type }`.

---

## Documentación de la API

### Base URL

```
http://localhost:8787/api          # desarrollo (wrangler dev)
https://\<worker\>.workers.dev/api   # producción
```

> Todos los endpoints bajo `/api/*` aplican el middleware CORS configurado con `CORS_ORIGIN`.

---

### Autenticación — `/api/auth` (Better Auth)

Better Auth gestiona las rutas automáticamente.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/sign-up/email` | Registro con email + contraseña |
| `POST` | `/api/auth/sign-in/email` | Login con email + contraseña |
| `POST` | `/api/auth/sign-out` | Cerrar sesión |
| `GET` | `/api/auth/session` | Sesión activa del usuario |
| `GET` | `/api/auth/sign-in/github` | OAuth GitHub |
| `GET` | `/api/auth/sign-in/google` | OAuth Google |

Ver la [documentación oficial de Better Auth](https://www.better-auth.com/docs) para el listado completo.

---

### Usuarios — `/api/users`

> Requiere sesión activa de Better Auth.

| Método | Ruta | Body | Respuesta | Descripción |
|---|---|---|---|---|
| `GET` | `/api/users` | — | `200 UserWithProfile[]` | Lista todos los usuarios con perfil |
| `GET` | `/api/users/:id` | — | `200 UserWithProfile` | Usuario por ID (`404` si no existe) |
| `PATCH` | `/api/users/:id` | `UpdateUserDto` | `200 UserWithProfile` | Actualiza datos del usuario o perfil |
| `DELETE` | `/api/users/:id` | — | `200 { message }` | Elimina usuario y su perfil |

**`UpdateUserDto`**
```ts
{
  email?: string
  name?: string
  image?: string | null          // URL
  emailVerified?: boolean
  profile?: {
    displayName?: string
    avatarUrl?: string | null
    bannerUrl?: string | null
    bio?: string | null          // máx 500 chars
    age?: number | null          // ≥ 0
    isOnline?: boolean
  }
}
```
> Si no se incluye ningún campo retorna `400 "Provide at least one property to update"`.

---

### Canales — `/api/channels`

> Requiere sesión activa.

| Método | Ruta | Query / Body | Respuesta | Descripción |
|---|---|---|---|---|
| `GET` | `/api/channels` | `?page=1&limit=10` | `200 { data, meta }` | Lista canales paginada |
| `GET` | `/api/channels/:id` | — | `200 Channel` | Detalle de un canal |
| `POST` | `/api/channels` | `CreateChannelDto` | `200 Channel` | Crea canal (`ownerId` = usuario autenticado) |
| `PATCH` | `/api/channels/:id` | `UpdateChannelDto` | `200 Channel` | Actualiza canal |
| `DELETE` | `/api/channels/:id` | — | `200 { message }` | Elimina canal |

**`CreateChannelDto`**
```ts
{
  name: string           // min 1, max 100
  description?: string   // max 500
  isPrivate?: boolean    // default false
  category?: string      // default 'General'
}
```

---

### Miembros de canal — `/api/members`

> Requiere sesión activa.

| Método | Ruta | Body | Respuesta | Descripción |
|---|---|---|---|---|
| `GET` | `/api/members/joined` | — | `200 Channel[]` | Canales del usuario autenticado |
| `GET` | `/api/members/:channelId` | — | `200 ChannelMember[]` | Miembros de un canal |
| `GET` | `/api/members/:channelId/role/:userId` | — | `200 { role }` | Rol de un usuario en el canal |
| `POST` | `/api/members` | `{ channelId }` | `201 ChannelMember` | Unirse a un canal |
| `PATCH` | `/api/members/:channelId/:userId/role` | `{ role }` | `200 ChannelMember` | Cambiar rol (solo admins) |
| `DELETE` | `/api/members/:channelId` | — | `200 { message }` | Salir del canal |

**Roles disponibles:** `admin` | `moderator` | `member`

---

### Threads — `/api/threads`

> Requiere sesión activa. Los threads organizan las conversaciones dentro de un canal.

| Método | Ruta | Body | Respuesta | Descripción |
|---|---|---|---|---|
| `GET` | `/api/threads/channel/:channelId` | — | `200 Thread[]` | Todos los threads del canal |
| `GET` | `/api/threads/channel/:channelId/active` | — | `200 Thread[]` | Solo threads no archivados |
| `GET` | `/api/threads/:id` | — | `200 Thread` | Detalle de un thread |
| `POST` | `/api/threads` | `CreateThreadDto` | `201 Thread` | Crear thread |
| `PATCH` | `/api/threads/:id` | `UpdateThreadDto` | `200 Thread` | Actualizar thread |
| `DELETE` | `/api/threads/:id` | — | `200 { message }` | Eliminar thread (creador o admin) |
| `POST` | `/api/threads/:id/archive` | — | `200 Thread` | Archivar thread |
| `POST` | `/api/threads/:id/unarchive` | — | `200 Thread` | Desarchivar thread |

**`CreateThreadDto`**
```ts
{
  channelId: string    // UUID del canal
  name: string         // min 1, max 100
  description?: string // max 500
}
```

**`UpdateThreadDto`**
```ts
{
  name?: string
  description?: string
  isArchived?: boolean
}
```

---

### Mensajes — `/api/messages`

> Requiere sesión activa. Los mensajes viven dentro de un thread.

| Método | Ruta | Query / Body | Respuesta | Descripción |
|---|---|---|---|---|
| `GET` | `/api/messages/thread/:threadId` | `?limit=50&offset=0` | `200 MessageWithSender[]` | Mensajes del thread (requiere membresía en el canal) |
| `POST` | `/api/messages` | `CreateMessageDto` | `201 Message` | Crear mensaje + broadcast WebSocket inmediato |
| `DELETE` | `/api/messages/:id` | — | `200 { message }` | Eliminar mensaje (autor, moderador o admin) |

**`CreateMessageDto`**
```ts
{
  threadId: string                      // UUID del thread
  content: string                       // puede ser "" si hay attachments
  attachments?: MessageAttachmentDto[]  // máx 10
}
// Requiere: content.length > 0 OR attachments.length > 0
```

**`MessageAttachmentDto`**
```ts
{
  id: string         // UUID
  url: string        // URL pública R2
  filename: string   // max 255 chars
  mimeType: string
  size: number       // bytes
  type: 'image' | 'document' | 'video' | 'audio'
}
```

**Respuesta `MessageWithSender`**
```json
{
  "id": "uuid",
  "threadId": "uuid",
  "senderId": "userId",
  "content": "Hola mundo",
  "attachments": [],
  "createdAt": "2026-02-20T10:00:00.000Z",
  "sender": {
    "id": "userId",
    "name": "Juan García",
    "image": null
  }
}
```

> Tras persistir el mensaje en BD, el `MessageService` llama al `ChatThread` DO que hace broadcast `NEW_MESSAGE` a todos los suscriptores activos.

---

### Uploads — `/api/uploads`

> Requiere sesión activa. El body es siempre `multipart/form-data`.

| Método | Ruta | Campo FormData | Descripción |
|---|---|---|---|
| `POST` | `/api/uploads/profile/avatar` | `file` | Avatar de perfil |
| `POST` | `/api/uploads/profile/banner` | `file` | Banner de perfil |
| `POST` | `/api/uploads/channel/icon` | `file` | Icono de canal |
| `POST` | `/api/uploads/channel/banner` | `file` | Banner de canal |
| `POST` | `/api/uploads/message/image` | `file` | Imagen en mensaje |
| `POST` | `/api/uploads/message/attachment` | `file` | Adjunto en mensaje |
| `POST` | `/api/uploads/message/images` | `files` | Hasta 10 imágenes |
| `POST` | `/api/uploads/message/attachments` | `files` | Hasta 10 adjuntos |
| `GET` | `/api/uploads/info` | — | Límites y tipos MIME permitidos |

**Respuesta (archivo único)**
```json
{
  "success": true,
  "data": {
    "url": "https://r2.dev/profile/avatars/uuid.jpg",
    "key": "profile/avatars/uuid.jpg",
    "size": 204800,
    "mimeType": "image/jpeg"
  }
}
```

**Respuesta (múltiples archivos)**
```json
{
  "success": true,
  "data": [
    { "url": "...", "key": "...", "size": 0, "mimeType": "..." }
  ]
}
```

---

### WebSocket — `/ws`

**Autenticación:** Cookie de sesión válida de Better Auth. El Worker valida la sesión y delega la conexión al `UserSession` DO.

```
GET /ws
Upgrade: websocket
Cookie: <sesión Better Auth>
```

#### Eventos cliente → servidor

| Evento | Payload | Descripción |
|---|---|---|
| `JOIN_THREAD` | `{ threadId: string }` | Suscribirse a actualizaciones del thread |
| `LEAVE_THREAD` | `{ threadId: string }` | Cancelar suscripción |

#### Confirmaciones servidor → cliente

| Evento | Payload | Descripción |
|---|---|---|
| `JOINED_THREAD` | `{ threadId: string }` | Confirmación de suscripción |
| `LEFT_THREAD` | `{ threadId: string }` | Confirmación de baja |
| `ERROR` | `{ message: string }` | Error en el procesamiento |

#### Eventos de push servidor → cliente

**`NEW_MESSAGE`**
```json
{
  "type": "NEW_MESSAGE",
  "payload": {
    "id": "uuid",
    "threadId": "uuid",
    "senderId": "userId",
    "content": "Hola mundo",
    "attachments": [],
    "createdAt": "2026-02-20T10:00:00.000Z",
    "sender": { "id": "...", "name": "...", "image": null }
  }
}
```

**`DELETE_MESSAGE`**
```json
{
  "type": "DELETE_MESSAGE",
  "payload": { "messageId": "uuid", "threadId": "uuid" }
}
```

---

## Módulos

| Módulo | Ruta base | Descripción |
|---|---|---|
| `AuthModule` | `/api/auth` | Proxy a Better Auth |
| `UsersModule` | `/api/users` | CRUD usuarios + perfiles |
| `ChannelModule` | `/api/channels` | CRUD canales con paginación |
| `MemberAccessModule` | `/api/members` | Membresías, roles y control de acceso |
| `ThreadModule` | `/api/threads` | Threads + archivo/desarchivado |
| `MessageModule` | `/api/messages` | Mensajes con attachments y broadcast DO |
| `UploadModule` | `/api/uploads` | Upload directo a R2 por tipo de recurso |

### Composition Root

`src/index.ts` instancia todas las dependencias manualmente siguiendo el patrón **Composition Root**, sin IoC container (requerido por compatibilidad con el entorno Cloudflare Workers):

```
Repositories → Services → Controllers → Modules → app.route(...)
```

---

## Códigos de estado HTTP

| Código | Significado |
|---|---|
| `200 OK` | Operación exitosa |
| `201 Created` | Recurso creado |
| `400 Bad Request` | JSON inválido o error de validación Zod |
| `401 Unauthorized` | Sesión ausente o inválida |
| `403 Forbidden` | Sin permisos suficientes |
| `404 Not Found` | Recurso no encontrado |
| `426 Upgrade Required` | Se esperaba conexión WebSocket |
| `500 Internal Server Error` | Error inesperado (revisar logs del Worker) |

---

## Scripts disponibles

```bash
bun run dev          # Servidor local con Bun (--hot), sin emulación de DOs
bun run cf:dev       # wrangler dev — emula Workers + Durable Objects localmente
bun run cf:deploy    # wrangler deploy — despliega en Cloudflare
bun run cf:types     # wrangler types — genera tipos de bindings Cloudflare

bunx drizzle-kit push      # Aplica esquema directamente a la BD (dev)
bunx drizzle-kit generate  # Genera archivos de migración SQL
bunx drizzle-kit migrate   # Aplica migraciones generadas
```
