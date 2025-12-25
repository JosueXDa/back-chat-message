# Guía de Integración Frontend - Actualización de Mensajes

Esta guía detalla los cambios recientes en la estructura de datos de los mensajes para incluir información del perfil del remitente (`sender.profile`).

## 1. API REST

### Obtener Mensajes de un Hilo

**Endpoint:** `GET /api/chats/messages/thread/:threadId`

La respuesta ahora incluye un objeto `sender` anidado con la información del perfil del usuario.

**Estructura de Respuesta (Array de Mensajes):**

```json
[
  {
    "id": "msg_uuid",
    "content": "Hola mundo",
    "createdAt": "2023-12-24T10:00:00Z",
    "senderId": "user_uuid",
    "threadId": "thread_uuid",
    "sender": {
      "id": "user_uuid",
      "name": "username",
      "profile": {
        "displayName": "Nombre Visible",
        "avatarUrl": "https://ejemplo.com/avatar.jpg" // puede ser null
      }
    }
  }
]
```

**Cambios Clave:**
*   Se eliminó la dependencia de buscar datos de usuario por separado.
*   `sender.profile.displayName` debe usarse como el nombre principal a mostrar.
*   `sender.profile.avatarUrl` contiene la URL del avatar.

## 2. WebSockets

### Evento: Nuevo Mensaje

El evento `NEW_MESSAGE` recibido a través del WebSocket también ha sido actualizado para coincidir con la estructura de la API REST.

**Tipo de Evento:** `NEW_MESSAGE`

**Payload:**

```json
{
  "type": "NEW_MESSAGE",
  "payload": {
    "id": "msg_uuid",
    "content": "Nuevo mensaje en tiempo real",
    "senderId": "user_uuid",
    "threadId": "thread_uuid",
    "createdAt": "2023-12-24T10:05:00.000Z",
    "sender": {
      "id": "user_uuid",
      "name": "username",
      "profile": {
        "displayName": "Nombre Visible",
        "avatarUrl": "https://ejemplo.com/avatar.jpg" // puede ser null
      }
    }
  }
}
```

## 3. Tipos TypeScript (Sugerencia para Frontend)

Para mantener la consistencia en el frontend, se recomienda actualizar las interfaces de TypeScript:

```typescript
export interface UserProfile {
  displayName: string;
  avatarUrl: string | null;
}

export interface MessageSender {
  id: string;
  name: string;
  profile: UserProfile;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  threadId: string;
  sender: MessageSender;
}
```

## Resumen de Integración

1.  **Renderizado de Mensajes**: Actualizar los componentes de mensaje para leer `message.sender.profile.displayName` y `message.sender.profile.avatarUrl`.
2.  **Store/Estado**: Si estás normalizando datos (ej. Redux, Zustand), asegúrate de que el store maneje esta estructura anidada o la aplane según sea necesario al recibir los datos.
3.  **Optimistic Updates**: Al crear un mensaje optimista en el frontend, asegúrate de construir un objeto temporal que cumpla con esta estructura (usando los datos del usuario actual) para evitar errores de renderizado antes de que llegue la confirmación del servidor.
