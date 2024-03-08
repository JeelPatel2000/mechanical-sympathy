import { getTestDbConnection } from "./db";

export default async () => {
  const testPool = getTestDbConnection();

  await testPool.query(`DROP TABLE store;`);

  await testPool.end();
};
