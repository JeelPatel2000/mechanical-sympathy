import { Pool } from "pg";
import { DurableEventEnvelope, EventStore, Stream } from "./types";

export const postgresqlEventStore = (pool: Pool): EventStore => {
  const append = async (stream: Stream) => {};
  const read: (streamId: string) => Promise<DurableEventEnvelope[]> = async (streamId: string) => [];

  return {
    append,
    read,
  };
};
