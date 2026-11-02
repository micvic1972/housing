export type RetryMessage = {
  text: string;
  id: string;
};

export function getRetryMessage(
  previous: RetryMessage | null,
  text: string,
  createId: () => string = () => crypto.randomUUID(),
): RetryMessage {
  if (previous?.text === text) return previous;
  return { text, id: createId() };
}
