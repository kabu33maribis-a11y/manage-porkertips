import { WebSocketServer } from "ws";

const PORT = Number(process.env.WS_PORT || 8787);

/** @type {Map<string, {host: import("ws").WebSocket | null, clients: Set<import("ws").WebSocket>, lastState: any}>} */
const rooms = new Map();

function roomFor(code) {
  const key = (code || "").toUpperCase();
  if (!rooms.has(key)) {
    rooms.set(key, { host: null, clients: new Set(), lastState: null });
  }
  return rooms.get(key);
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  ws.meta = { roomCode: "", role: "guest", clientId: "" };

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "invalid_json" }));
      return;
    }

    if (msg.type === "join") {
      const roomCode = (msg.roomCode || "").toUpperCase();
      if (!roomCode) {
        ws.send(JSON.stringify({ type: "error", message: "room_required" }));
        return;
      }
      const room = roomFor(roomCode);
      ws.meta = {
        roomCode,
        role: msg.role === "host" ? "host" : "guest",
        clientId: msg.clientId || "",
      };

      room.clients.add(ws);
      if (ws.meta.role === "host") {
        room.host = ws;
      }

      ws.send(
        JSON.stringify({
          type: "joined",
          roomCode,
          role: ws.meta.role,
        }),
      );

      if (room.lastState) {
        ws.send(
          JSON.stringify({
            type: "state_sync",
            roomCode,
            state: room.lastState,
            from: "server",
          }),
        );
      }
      return;
    }

    if (!ws.meta.roomCode) {
      ws.send(JSON.stringify({ type: "error", message: "not_joined" }));
      return;
    }

    const room = roomFor(ws.meta.roomCode);

    if (msg.type === "state_push") {
      if (ws.meta.role !== "host") return;
      room.lastState = msg.state;
      for (const client of room.clients) {
        if (client.readyState !== 1) continue;
        client.send(
          JSON.stringify({
            type: "state_sync",
            roomCode: ws.meta.roomCode,
            state: msg.state,
            from: msg.senderId || "",
          }),
        );
      }
      return;
    }

    if (msg.type === "request") {
      const host = room.host;
      if (!host || host.readyState !== 1) {
        ws.send(JSON.stringify({ type: "error", message: "host_not_available" }));
        return;
      }
      host.send(
        JSON.stringify({
          type: "request_forward",
          roomCode: ws.meta.roomCode,
          from: msg.senderId || "",
          payload: msg.payload,
        }),
      );
      return;
    }
  });

  ws.on("close", () => {
    const { roomCode, role } = ws.meta;
    if (!roomCode) return;
    const room = roomFor(roomCode);
    room.clients.delete(ws);
    if (role === "host" && room.host === ws) {
      room.host = null;
    }
    if (room.clients.size === 0) {
      rooms.delete(roomCode);
    }
  });
});

console.log(`WS relay running: ws://localhost:${PORT}`);

