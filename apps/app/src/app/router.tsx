import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './app-layout';
import { FormLayout } from './form-layout';
import { TodayPage } from '@/pages/today';
import { TasksPage } from '@/pages/tasks';
import { HabitsPage } from '@/pages/habits';
import { StatsPage } from '@/pages/stats';
import { TaskFormPage } from '@/pages/task-form';
import { HabitFormPage } from '@/pages/habit-form';
import { DraftReviewPage } from '@/pages/draft-review';
import { host } from '@/lib/host';

/** Mia's signed launch (verified at boot) carries a batch → the review (the mini app); otherwise the mobile app's Today. */
function LaunchRedirect() {
  const batchId = host.launch.batchId;
  return <Navigate to={batchId ? `/drafts?batchId=${batchId}` : '/today'} replace />;
}

export const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      children: [
        { index: true, element: <LaunchRedirect /> },
        { path: 'today', element: <TodayPage /> },
        { path: 'tasks', element: <TasksPage /> },
        { path: 'habits', element: <HabitsPage /> },
        { path: 'stats', element: <StatsPage /> },
      ],
    },
    {
      element: <FormLayout />,
      children: [
        { path: 'tasks/new', element: <TaskFormPage /> },
        { path: 'tasks/:id', element: <TaskFormPage /> },
        { path: 'habits/new', element: <HabitFormPage /> },
        { path: 'habits/:id', element: <HabitFormPage /> },
        { path: 'drafts', element: <DraftReviewPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/today" replace /> },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);
