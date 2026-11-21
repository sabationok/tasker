import { useState } from 'react';
import { tr } from '@/i18n';
import { NavRow } from '@/ui';
import { useCategories } from './categories.queries';
import { CategoryIcon } from './category-icon';
import { CategoryPickerSheet } from './category-picker-sheet';

/** @ui CategoryRow @spec Form row showing the chosen category; opens the picker sheet. Empty value = the default category. @keywords category field, category picker */
export function CategoryRow({ value, onChange }: { value: string | undefined; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const categories = useCategories();
  const category = categories.find((c) => c.id === value) ?? categories.find((c) => c.isDefault);
  return (
    <>
      <NavRow icon={<CategoryIcon category={category} size="sm" />} label={tr('Category')} value={category?.name} onClick={() => setOpen(true)} />
      <CategoryPickerSheet open={open} onClose={() => setOpen(false)} value={category?.id} onChange={onChange} />
    </>
  );
}
