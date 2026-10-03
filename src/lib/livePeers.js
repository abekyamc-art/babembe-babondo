import { base44 } from "@/api/base44Client";

/** A room row older than this is treated as someone who has gone. */
export const PEER_TTL_MS = 45000;

export async function joinRoom({ roomId, user, username, avatarUrl, role }) {
  const page = await base44.entities.LivePeer.filter(
    { room_id: roomId, user_email: user.email },
    { limit: 1 }
  );
  const stamp = {
    room_id: roomId,
    user_email: user.email,
    username,
    avatar_url: avatarUrl || "",
    role,
    camera_on: role === "host",
    joined_at: new Date().toISOString(),
    last_seen: new Date().toISOString(),
  };
  const existing = page?.items?.[0];
  if (existing) return base44.entities.LivePeer.update(existing.id, stamp);
  return base44.entities.LivePeer.create(stamp);
}

export function beat(peerId, role, cameraOn) {
  return base44.entities.LivePeer.update(peerId, {
    last_seen: new Date().toISOString(),
    ...(role ? { role } : {}),
    ...(typeof cameraOn === "boolean" ? { camera_on: cameraOn } : {}),
  });
}

export function roomPeers(roomId) {
  const cutoff = new Date(Date.now() - PEER_TTL_MS).toISOString();
  return base44.entities.LivePeer.filter(
    { room_id: roomId, last_seen: { $gte: cutoff } },
    { limit: 20 }
  ).then((page) => page?.items || []);
}

export function leaveRoom(peerId) {
  if (!peerId) return Promise.resolve();
  return base44.entities.LivePeer.delete(peerId).catch(() => {});
}

export function dropPeer(peerId) {
  return leaveRoom(peerId);
}

export function sendSignal({ roomId, from, to, kind, payload }) {
  return base44.entities.LiveSignal.create({
    room_id: roomId,
    from_email: from,
    to_email: to,
    kind,
    payload: JSON.stringify(payload),
    sent_at: new Date().toISOString(),
  });
}

export function pendingSignals(roomId, email) {
  return base44.entities.LiveSignal.filter(
    { room_id: roomId, to_email: email },
    { sort: "created_date", limit: 20 }
  ).then((page) => page?.items || []);
}

export function dropSignal(id) {
  return base44.entities.LiveSignal.delete(id).catch(() => {});
}

/** Clearing my own traffic keeps the room's records short-lived. */
export function clearMySignals(roomId, email) {
  return Promise.all([
    base44.entities.LiveSignal.deleteMany({ room_id: roomId, from_email: email }).catch(() => {}),
    base44.entities.LiveSignal.deleteMany({ room_id: roomId, to_email: email }).catch(() => {}),
  ]);
}

export function clearSignalsWith(roomId, email) {
  return Promise.all([
    base44.entities.LiveSignal.deleteMany({ room_id: roomId, from_email: email }).catch(() => {}),
    base44.entities.LiveSignal.deleteMany({ room_id: roomId, to_email: email }).catch(() => {}),
  ]);
}

export function clearRoom(roomId) {
  return Promise.all([
    base44.entities.LivePeer.deleteMany({ room_id: roomId }).catch(() => {}),
    base44.entities.LiveSignal.deleteMany({ room_id: roomId }).catch(() => {}),
  ]);
}