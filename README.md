# Back App Message

Backend modular para una aplicación de mensajería en tiempo (casi) real construido sobre Bun + Hono. Expone endpoints REST para autenticación, gestión de usuarios y sirve como base para módulos de chat y canales.

## Cambios Recientes
- ✅ **Endpoints de Persistencia de Mensajes**: Se han implementado dos nuevos endpoints REST bajo `/api/chats/messages`:
  - `GET /:channelId` - Obtiene los últimos 50 mensajes de un canal
  - `POST /` - Crea un nuevo mensaje (el `senderId` se obtiene automáticamente de la sesión)
- ✅ **MessageController**: Nuevo controlador que sigue el patrón de diseño modular (Repository → Service → Controller)
- ✅ **Integración en ChatModule**: El nuevo controlador está totalmente integrado y es inyectable para testing
- ✅ **WebSocket Fix**: Corregido el manejo de WebSockets en Bun. Reemplazado `createBunWebSocket` (obsoleto) por `upgradeWebSocket` y `websocket` directos de `hono/bun`. Se mejoró la inicialización de conexiones y manejo de eventos.

## Propósito del proyecto
- Unificar autenticación (Better Auth) y perfiles de usuario en un backend ligero.
- Proveer endpoints CRUD de usuarios listos para integrarse con un front-end React/Next.
- Servir como base extensible para funcionalidades de mensajería (canales, mensajes, presencia) apoyándose en Drizzle ORM y Neon/PostgreSQL.

## Características clave
1. **Autenticación Better Auth** expuesta mediante `/api/auth/*` y persistida en PostgreSQL.
2. **Gestión de usuarios + perfiles** con validaciones `zod` y capa `service/repository` (@src/modules/users/controllers/user.controller.ts#13-67).
3. **Infraestructura de Chat en Tiempo Real** con WebSockets (Bun native), canales y mensajes persistidos (@src/modules/chat/gateway/chat.gateway.ts).
4. **Stack totalmente tipado** con TypeScript y Bun + TSX para DX rápida.

## Notas de Implementación

### WebSocket (Bun + Hono)
- Se utiliza `upgradeWebSocket` y `websocket` directamente desde `hono/bun` (el `createBunWebSocket` está deprecado).
- Los WebSockets requieren sesión válida de Better Auth.
- La arquitectura de gateway permite inyección de dependencias para pruebas.
- La gestión de conexiones se realiza mediante `ConnectionManager` que mantiene un mapa de usuarios conectados.

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
   └─ chat/                 # Gateway (WS) + Controllers + Services
      ├─ gateway/           # Lógica WebSocket
      └─ ...
```

```mermaid
graph TD
    %% Definición de estilos para que sea visualmente claro
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef entry fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef logic fill:#e0f2f1,stroke:#00695c,stroke-width:1px;
    classDef data fill:#fbe9e7,stroke:#d84315,stroke-width:1px;
    classDef db fill:#263238,stroke:#eceff1,stroke-width:2px,color:#fff;

    A[Cliente HTTP / Front-end]:::client
    H[(PostgreSQL/Neon)]:::db

    subgraph "Server (Hono)"
        B[Hono App]:::entry
        
        subgraph "Auth Module"
            C[Better Auth Router]:::entry
            G[Drizzle Adapter]:::data
        end

        subgraph "Users Module"
            D[UsersModule/Controller]:::entry
            E[UserService]:::logic
            F[UserRepository]:::data
        end

        subgraph "Chat Module"
            I[ChatGateway WS]:::entry
            L[ChannelController]:::entry
            R[MessageController]:::entry
            S[ChannelMemberController]:::entry
            
            subgraph Services
                J[MessageService]:::logic
                M[ChannelService]:::logic
                O[ChannelMemberService]:::logic
            end

            subgraph Repositories
                K[MessageRepository]:::data
                N[ChannelRepository]:::data
                P[ChannelMemberRepository]:::data
            end
        end
    end

    %% Conexiones
    A -->|REST| B
    A -->|WebSocket| B
    
    %% Rutas desde Hono
    B --> C
    B --> D
    B --> I
    B --> L
    B --> R
    B --> S

    %% Conexiones Internas
    C --> G
    D --> E --> F
    I --> J --> K
    L --> M --> N
    R --> J --> K
    S --> O --> P

    %% Conexiones a DB
    G & F & K & N & P --> H
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

### Chat (`/api/chats`)

**Nota de Autenticación**: Todos los endpoints de Chat (canales, miembros y mensajes) requieren una sesión válida de Better Auth. La sesión se valida automáticamente en cada request y retorna `401 Unauthorized` si no es válida.

#### Canales (`/api/chats/channels`)
| Método | Ruta | Body | Respuesta exitosa | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/api/chats/channels` | `?page=1&limit=10` | `200 { data: Channel[], meta: ... }` | Lista canales con paginación.
| GET | `/api/chats/channels/:id` | — | `200 Channel` | Obtiene detalles de un canal específico.
| POST | `/api/chats/channels` | `CreateChannelDto` | `200 Channel` | Crea un nuevo canal. Requiere autenticación.
| PATCH | `/api/chats/channels/:id` | `UpdateChannelDto` | `200 Channel` | Actualiza un canal existente. Requiere autenticación.
| DELETE | `/api/chats/channels/:id` | — | `200 { message: "Channel deleted" }` | Elimina un canal. Requiere autenticación.

**Esquema `CreateChannelDto`**:
```ts
name: string (min 1, max 100)
description?: string | null (max 500)
isPrivate?: boolean (default false)
category?: string (default 'General')
memberIds?: string[] (optional, unique)
ownerId?: string (optional)
```

#### Miembros (`/api/chats/members`)
| Método | Ruta | Body | Respuesta exitosa | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/api/chats/members/:channelId` | — | `200 ChannelMember[]` | Lista los miembros de un canal.
| GET | `/api/chats/members/joined` | — | `200 Channel[]` | Lista los canales a los que el usuario autenticado se ha unido.
| POST | `/api/chats/members` | `{ channelId: string }` | `200 ChannelMember` | El usuario autenticado se une al canal especificado.
| DELETE | `/api/chats/members/:channelId` | — | `200 { message: "Member deleted" }` | El usuario autenticado sale del canal especificado.

#### Mensajes (`/api/chats/messages`)
| Método | Ruta | Body | Respuesta exitosa | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/api/chats/messages/:channelId` | — | `200 Message[]` | Lista los últimos 50 mensajes del canal, ordenados por fecha descendente. Requiere autenticación.
| POST | `/api/chats/messages` | `CreateMessageDto` | `201 Message` | Crea un nuevo mensaje en el canal especificado. El `senderId` se obtiene automáticamente de la sesión autenticada. Requiere autenticación.

**Esquema `CreateMessageDto`** (@src/modules/chat/dtos/create-message.dto.ts#3-9):
```ts
channelId: string (UUID válido)
content: string (min 1 carácter)
```

**Respuesta Message**:
```ts
{
  id: string (UUID)
  senderId: string
  channelId: string (UUID)
  content: string
  createdAt: timestamp
}
```

### Estados HTTP esperados
- `200 OK`: Operación exitosa.
- `201 Created`: (reservado para futuros endpoints de creación).
- `400 Bad Request`: JSON inválido o violación de esquema `zod`.
- `404 Not Found`: Usuario inexistente.
- `500 Internal Server Error`: Error inesperado (consultar logs de Bun/Hono).

### WebSockets (`/ws`)
- **Ruta**: `/ws`
- **Autenticación**: Requiere cookie de sesión válida de Better Auth.
- **Eventos**:
  - `SEND_MESSAGE`: Cliente envía mensaje.
    ```json
    { "type": "SEND_MESSAGE", "payload": { "channelId": "...", "content": "..." } }
    ```
  - `NEW_MESSAGE`: Servidor notifica nuevo mensaje.

## Próximos pasos sugeridos
- ✅ Endpoints REST CRUD de mensajes implementados (`/api/chats/messages`).
- ✅ WebSocket integrado correctamente con `hono/bun` (sin dependencias deprecadas).
- Integrar cliente Frontend con WebSockets para mensajería en tiempo real.
- Añadir eventos de "Escribiendo..." y confirmación de lectura en WebSockets.
- Añadir paginación a los endpoints de mensajes.
- Implementar pruebas automatizadas para `MessageService` y `MessageRepository`.
- Documentar scripts específicos de despliegue (Docker, CI/CD) cuando estén disponibles.

## Historial de Correcciones

### v1.1.0 - WebSocket Fix (Diciembre 2025)
**Problema**: Error `TypeError: undefined is not an object (evaluating 'websocketListeners.onMessage')` al conectar clientes al WebSocket.

**Causa**: La función `createBunWebSocket` estaba deprecada en Hono 4.10.6+ y no inicializaba correctamente los event listeners.

**Solución**:
- Reemplazó `createBunWebSocket` por los imports directos `upgradeWebSocket` y `websocket` desde `hono/bun`
- Refactorizó el callback de `upgradeWebSocket` para inicializar correctamente `ws.data` en cada evento
- Mejoró el manejo de referencias de WebSocket dentro del callback

**Archivos Modificados**:
- `src/index.ts` - Actualización de imports y callback WebSocket

**Testing**: 
- ✅ Backend inicia sin errores
- ✅ Usuarios se conectan correctamente vía WebSocket
- ✅ Arquitectura de módulos intacta
