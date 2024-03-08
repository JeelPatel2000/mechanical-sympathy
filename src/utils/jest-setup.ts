import { getTestDbConnection } from "./db";

export default async () => {
  const testPool = getTestDbConnection();
  await testPool.query(`
            CREATE TABLE IF NOT EXISTS store (
              position      BIGSERIAL,
              stream_id     TEXT,
              version       SERIAL,
              event_type    TEXT,
              payload       JSONB,
              PRIMARY KEY (stream_id, version)
            );
        `);

  await testPool.end();
};
