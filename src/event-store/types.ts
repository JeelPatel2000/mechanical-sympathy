interface Payload {
  [key: string]: unknown,
  eventType: string
}

export interface EventEnvelope {
  streamId: string
  version: number
  eventType: Payload['eventType']
  payload: Payload
}

export interface DurableEventEnvelope extends EventEnvelope {
  position: number
}

export interface Stream {
  streamId: string
  expectedVersion: number
  events: DurableEventEnvelope[]
}

export interface EventStore {
  read: (streamId: string) => Promise<DurableEventEnvelope[]>
  append: (stream: Stream) => Promise<void>
}
