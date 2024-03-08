import { Pool } from "pg";

export const getTestDbConnection = (): Pool =>
  new Pool({
    connectionString: `postgres://postgres:postgres@localhost:5432/postgres`,
  });
