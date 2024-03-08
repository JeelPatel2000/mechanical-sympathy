interface Payload {
  [key: string]: unknown,
  eventType: string
}

export interface EventEnvelope {
  payload: Payload
}

export interface DurableEventEnvelope extends EventEnvelope {
  position: number
  streamId: string
  version: number
  eventType: Payload['eventType']
}

export interface Stream {
  streamId: string
  expectedVersion: number
  events: EventEnvelope[]
}

export interface EventStore {
  read: (streamId: string) => Promise<DurableEventEnvelope[]>
  append: (stream: Stream) => Promise<void>
}
