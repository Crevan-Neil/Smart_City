// ─────────────────────────────────────────────
//  services/socketBroadcast.js
//  Emits Socket.io events to all connected clients
//
//  Events emitted:
//    city_update   — live sensor reading
//    anomaly_alert — threshold breach notification
// ─────────────────────────────────────────────

let _io = null;

export function initSocketBroadcast(io) {
  _io = io;
  console.log("[socket-broadcast] initialised");
}

// Emit a live sensor update to all clients
export function broadcast(event) {
  if (!_io) return;
  _io.emit("city_update", event);
}

// Emit a threshold breach alert to all clients
export function broadcastAnomaly(alert) {
  if (!_io) return;
  _io.emit("anomaly_alert", alert);
}

// Emit AI narration for an anomaly
export function broadcastAiNarration(narrationEvent) {
  if (!_io) return;
  _io.emit("ai_narration", narrationEvent);
}

// Emit to a specific room (e.g. a single building's viewers)
export function broadcastToRoom(room, eventName, payload) {
  if (!_io) return;
  _io.to(room).emit(eventName, payload);
}