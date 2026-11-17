import type { CategoriesService } from '../../categories/categories.service';
import type { ChecklistService } from '../../checklist/checklist.service';
import type { HabitCheckinsService } from '../../habits/services/habit-checkins';
import type { HabitsService } from '../../habits/services/habits';
import type { ItemOccurrencesService } from '../../items/services/item-occurrences';
import type { ItemThreadsService } from '../../items/services/item-threads';
import type { ItemsService } from '../../items/services/items';
import type { ProjectsService } from '../../projects/projects.service';
import type { SettingsService } from '../../settings/settings.service';
import type { StatsService } from '../../stats/services/stats';
import type { TagsService } from '../../tags/tags.service';
import type { TodayService } from '../../today/services/today';
import type { PreviewService } from '../services/preview/preview.service';

export type ToolDeps = {
  items: ItemsService;
  occurrences: ItemOccurrencesService;
  threads: ItemThreadsService;
  checklist: ChecklistService;
  habits: HabitsService;
  checkins: HabitCheckinsService;
  projects: ProjectsService;
  categories: CategoriesService;
  tags: TagsService;
  today: TodayService;
  stats: StatsService;
  settings: SettingsService;
  preview: PreviewService;
};
