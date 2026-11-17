import { useParams } from 'react-router-dom';
import { HabitFormScreen } from '@/features/habits/habit-form/habit-form-screen';

/** `/habits/new` or `/habits/:id`. */
export function HabitFormPage() {
  const { id } = useParams<{ id: string }>();
  return <HabitFormScreen key={id ?? 'new'} id={id} />;
}
