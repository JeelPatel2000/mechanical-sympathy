import { getTestDbConnection } from "../utils/db";
import { PostgresUniqueConstraintViolationError, postgresqlEventStore } from "./postgresql";

describe(`postgresql eventstore`, () => {
  const pool = getTestDbConnection();
  const eventStore = postgresqlEventStore(pool);

  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await pool.query(`TRUNCATE TABLE store RESTART IDENTITY;`);
  });
  test(`given empty table > when read stream_id > returns no envelopes`, async () => {
    const streamId = `Wallet#1`;
    await expect(eventStore.read(streamId)).resolves.toEqual([]);
  });

  test(`given events for differnt stream_id > when read stream_id > return no envelopes`, async () => {
    await pool.query(`
    INSERT INTO store (stream_id, version, event_type, payload) 
      VALUES 
    ('Wallet#2', 1, 'WalletCredited', '{}'::jsonb),
    ('Wallet#2', 2, 'WalletCredited', '{}'::jsonb);`);

    await expect(eventStore.read(`Wallet#1`)).resolves.toEqual([]);
  });

  test(`given events for stream_id > when read stream_id > returns envelopes`, async () => {
    await pool.query(`
    INSERT INTO store (stream_id, version, event_type, payload) 
      VALUES 
    ('Wallet#3', 1, 'WalletCredited', '{ "eventType": "WalletCredited", "amount": 10 }'::jsonb),
    ('Wallet#3', 2, 'WalletDebited', '{ "eventType": "WalletDebited", "amount": 5 }'::jsonb);`);

    await expect(eventStore.read(`Wallet#3`)).resolves.toEqual([
      { position: 1, streamId: `Wallet#3`, version: 1, eventType: `WalletCredited`, payload: { amount: 10, eventType: `WalletCredited` } },
      { position: 2, streamId: `Wallet#3`, version: 2, eventType: `WalletDebited`, payload: { amount: 5, eventType: `WalletDebited` } },
    ]);
  });

  test(`given no events > when append events > appends events`, async () => {
    const streamId = `Wallet#1`;
    await eventStore.append({ streamId, expectedVersion: 1, events: [
      { payload: { eventType: `WalletCredited`, amount: 10 } },
      { payload: { eventType: `WalletDebited`, amount: 3 } },
    ] });

    const { rows } = await pool.query(`SELECT position, stream_id, version, event_type, payload FROM store WHERE stream_id = $1`, [streamId]);
    expect(rows).toEqual([
      { position: `1`, stream_id: streamId, version: 1, event_type: `WalletCredited`, payload: { eventType: `WalletCredited`, amount: 10 } },
      { position: `2`, stream_id: streamId, version: 2, event_type: `WalletDebited`, payload: { eventType: `WalletDebited`, amount: 3 } },
    ]);
  });

  test(`given events for a stream_id > when append new event envelopes with same version > throws PostgresUniqueConstraintViolationError`, async () => {
    const streamId = `Wallet#1`;
    await eventStore.append({ streamId, expectedVersion: 1, events: [
      { payload: { eventType: `WalletCredited`, amount: 10 } },
    ] });

    const appendFn = async () => eventStore.append({ streamId, expectedVersion: 1, events: [
      { payload: { eventType: `WalletCredited`, amount: 10 } },
    ] });

    await expect(appendFn).rejects.toThrow(new PostgresUniqueConstraintViolationError(`Event store unique constraint violated`));
  });
});
