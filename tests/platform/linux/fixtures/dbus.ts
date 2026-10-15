import dbus from 'dbus-native';

/** A private protocol broker, independent of the host session and real players. */
export async function createDbusFixture() {
  const broker = dbus.createBroker();
  await new Promise<void>((resolve, reject) =>
    broker.listen({ host: '127.0.0.1', port: 0 }, (error) => (error ? reject(error) : resolve())),
  );
  const address = broker.address()!;
  const client = dbus.createClient({ busAddress: address, timeout: 2000 });
  client.on('error', () => {});
  return {
    address,
    client,
    async close() {
      client.connection.end();
      await new Promise<void>((resolve) => broker.close(resolve));
    },
  };
}
