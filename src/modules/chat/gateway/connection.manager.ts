import { ServerWebSocket } from "bun";

export class ConnectionManager {
    private connections: Map<string, ServerWebSocket<any>> = new Map();

    addConnection(userId: string, ws: ServerWebSocket<any>) {
        this.connections.set(userId, ws);
        console.log(`User ${userId} connected. Total connections: ${this.connections.size}`);
    }

    removeConnection(userId: string) {
        this.connections.delete(userId);
        console.log(`User ${userId} disconnected. Total connections: ${this.connections.size}`);
    }

    getConnection(userId: string): ServerWebSocket<any> | undefined {
        return this.connections.get(userId);
    }

    getConnectedUsers(): string[] {
        return Array.from(this.connections.keys());
    }
}
