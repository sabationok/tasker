import { useParams } from 'react-router-dom';
import { TaskFormScreen } from '@/features/items/task-form/task-form-screen';

/** `/tasks/new[?periodic=1&date=]` or `/tasks/:id`. */
export function TaskFormPage() {
  const { id } = useParams<{ id: string }>();
  return <TaskFormScreen key={id ?? 'new'} id={id} />;
}
