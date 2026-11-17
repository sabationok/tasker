import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './app-layout';
import { FormLayout } from './form-layout';
import { TodayPage } from '@/pages/today';
import { TasksPage } from '@/pages/tasks';
import { HabitsPage } from '@/pages/habits';
import { StatsPage } from '@/pages/stats';
import { TaskFormPage } from '@/pages/task-form';
import { HabitFormPage } from '@/pages/habit-form';
import { DraftsPage } from '@/pages/drafts';

export const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      children: [
        { index: true, element: <Navigate to="/today" replace /> },
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
        { path: 'drafts', element: <DraftsPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/today" replace /> },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);
