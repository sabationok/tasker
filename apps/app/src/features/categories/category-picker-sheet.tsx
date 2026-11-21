import { tr } from '@/i18n';
import { OptionList, Sheet } from '@/ui';
import { useCategories } from './categories.queries';
import { CategoryIcon } from './category-icon';

/** @ui CategoryPickerSheet @spec Choose one category in a bottom sheet. @keywords category picker, select category */
export function CategoryPickerSheet({ open, onClose, value, onChange }: { open: boolean; onClose: () => void; value: string | undefined; onChange: (id: string) => void }) {
  const categories = useCategories();
  return (
    <Sheet open={open} onClose={onClose} title={tr('Choose category')}>
      <OptionList
        label={tr('Category')}
        value={value}
        onChange={(id) => {
          onChange(id);
          onClose();
        }}
        options={categories.map((c) => ({ value: c.id, label: c.name, leading: <CategoryIcon category={c} size="sm" /> }))}
      />
    </Sheet>
  );
}
