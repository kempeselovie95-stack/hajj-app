/** Hub temps réel (Server-Sent Events) : messages de groupe, actualités et rafraîchissement des écrans. */
const connections = new Set();

function register(res, { userId, groups }) {
  const connection = { res, userId, groups: new Set(groups.map(Number)) };
  connections.add(connection);
  return connection;
}
const unregister = (connection) => connections.delete(connection);

function write(connection, type, data) {
  try { connection.res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); } catch { connections.delete(connection); }
}

/** Tous les clients connectés (actualités, annonces). */
function broadcast(type, data = {}) { for (const connection of connections) write(connection, type, data); }
/** Uniquement ceux qui suivent ce groupe. */
function toGroup(groupId, type, data = {}) { for (const connection of connections) if (connection.groups.has(Number(groupId))) write(connection, type, data); }
function toUser(userId, type, data = {}) { for (const connection of connections) if (Number(connection.userId) === Number(userId)) write(connection, type, data); }

setInterval(() => { for (const connection of connections) { try { connection.res.write(': ping\n\n'); } catch { connections.delete(connection); } } }, 25000).unref();

module.exports = { register, unregister, broadcast, toGroup, toUser };
