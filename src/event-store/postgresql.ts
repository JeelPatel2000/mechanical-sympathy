import { Pool } from "pg";
import { DurableEventEnvelope, EventStore, Stream } from "./types";

export const postgresqlEventStore = (pool: Pool): EventStore => {

  const append = async (stream: Stream) => {
    const { sql, values } = buildAppendQueryWihtValues(stream);
    try {
      await pool.query(`BEGIN`);
      await pool.query(sql, values);
      await pool.query(`COMMIT`);
    } catch (e: any) {
      await pool.query(`ROLLBACK`);
      const POSTGRESQL_UNIQUE_VIOLATION_ERROR_CODE = `23505`;
      if (e.code === POSTGRESQL_UNIQUE_VIOLATION_ERROR_CODE) {
        throw new PostgresUniqueConstraintViolationError(
          `Event store unique constraint violated`, { POSTGRESQL_UNIQUE_VIOLATION_ERROR_CODE },
        );
      }
      throw e;
    }
  };

  const read: (streamId: string) => Promise<DurableEventEnvelope[]> = async (streamId: string) => {
    const query = `
      SELECT position, stream_id, version, event_type, payload
      FROM store
      WHERE stream_id = $1`;
    const values = [streamId];
    const { rows } = await pool.query(query, values);
    return mapRows(rows);
  };

  return {
    append,
    read,
  };
};

function mapRows(rows: any[]): DurableEventEnvelope[] {
  return rows.map(row => ({
    position: Number(row.position),
    streamId: row.stream_id,
    version: row.version,
    eventType: row.event_type,
    payload: row.payload,
  }));
}

export function buildAppendQueryWihtValues(stream: Stream): { sql: string, values: any[] } {
  const { streamId, events, expectedVersion } = stream;
  const valueRows = [];
  const values = [];
  let valueCount = 0;
  let currentVersion = expectedVersion;

  for (const event of events) {
    valueRows.push(
      `($${++valueCount}, $${++valueCount}, $${++valueCount}, $${++valueCount}::jsonb)`,
    );
    values.push(streamId, currentVersion++, event.payload.eventType, event.payload);
  }

  const sql = `INSERT INTO store (stream_id, version, event_type, payload) values ${valueRows.join(`, `)}`;
  return {
    sql,
    values,
  };
}

export class PostgresUniqueConstraintViolationError extends Error {
  context: any;
  constructor(message: string, context?: any) {
    super();
    this.name = `PostgresUniqueConstraintViolationError`;
    this.message = message;
    this.context = context;
  }
};
