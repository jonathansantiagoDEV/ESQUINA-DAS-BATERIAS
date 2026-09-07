import { openDB } from "idb";

const DB_NAME = "voltexpress-offline";
const STORE = "pings";

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "localId", autoIncrement: true });
        s.createIndex("pedido_id", "pedido_id");
      }
    },
  });
}

export async function bufferPing(pedidoId, ping) {
  const db = await getDB();
  await db.add(STORE, { pedido_id: pedidoId, ping, created: Date.now() });
}

export async function drainPings(pedidoId) {
  const db = await getDB();
  const all = await db.getAll(STORE);
  const mine = all.filter((r) => r.pedido_id === pedidoId);
  return mine;
}

export async function clearBuffered(ids) {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  for (const id of ids) await tx.store.delete(id);
  await tx.done;
}

export async function bufferCount() {
  const db = await getDB();
  return (await db.count(STORE)) || 0;
}
