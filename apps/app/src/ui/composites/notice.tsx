import { Text } from '../primitives/text';

/** @ui Notice @spec A short list of messages in a caution box (warnings). @keywords warning, notice, alert box, messages */
export const Notice = ({ messages }: { messages: string[] }) => (
  <ul className="rounded-control bg-sunken px-row py-2">
    {messages.map((m) => (
      <li key={m}>
        <Text variant="label" tone="caution">
          {m}
        </Text>
      </li>
    ))}
  </ul>
);
