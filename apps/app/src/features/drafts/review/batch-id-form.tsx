import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tr } from '@/i18n';
import { routes } from '@/lib/routes';
import { Button, Field, FlexForm, Input, Text } from '@/ui';

/** Opened without a batch (a plain browser in dev): paste a batch id. Mia always passes one. */
export function BatchIdForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  return (
    <FlexForm
      gap="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) navigate(routes.drafts(value.trim()));
      }}
    >
      <Text variant="label" tone="muted">
        {tr('Mia opens this page with a batch of drafts. Without one, paste a batch id.')}
      </Text>
      <Field label={tr('Batch id')} htmlFor="batch-id">
        <Input id="batch-id" value={value} onChange={(e) => setValue(e.target.value)} placeholder="01a1…" />
      </Field>
      <Button type="submit">{tr('Open batch')}</Button>
    </FlexForm>
  );
}
