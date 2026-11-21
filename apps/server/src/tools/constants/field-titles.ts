/** Ukrainian field titles for tool input schemas (the keys of Mia's generic card). Keys are camelCase input names. */
export const FIELD_TITLES: Record<string, string> = {
  type: 'Тип', title: 'Назва', name: 'Назва', body: 'Опис', description: 'Опис', status: 'Статус', assignee: 'Виконавець',
  priority: 'Пріоритет', categoryId: 'Категорія', projectId: 'Проєкт', tagIds: 'Теги', date: 'Дата', dueAt: 'Термін',
  remindAt: 'Нагадати', pending: 'Щодня до виконання', parentId: 'Батьківська задача', recurrence: 'Повторення',
  startsOn: 'Початок', endsOn: 'Кінець', evaluation: 'Оцінка', subtasksOrder: 'Порядок потоків', checklist: 'Чекліст',
  reminders: 'Нагадування', source: 'Джерело', itemId: 'Запис', habitId: 'Звичка', lineId: 'Пункт чекліста', slot: 'Година',
  toDate: 'Нова дата', note: 'Нотатка', text: 'Текст', order: 'Порядок', threads: 'Потоки', targetValue: 'Ціль',
  targetCondition: 'Умова', unit: 'Одиниця', checklistMin: 'Мінімум пунктів', goals: 'Цілі', notesEnabled: 'Нотатки',
  value: 'Значення', checklistDone: 'Виконані пункти', archived: 'В архіві', query: 'Запит', limit: 'Кількість',
  icon: 'Іконка', color: 'Колір', timezone: 'Часовий пояс', locale: 'Мова', failedMode: 'Невиконані дні', weekStart: 'Початок тижня',
  period: 'Період', anchor: 'День', scope: 'Що рахувати', search: 'Пошук', open: 'Лише відкриті', periodic: 'Періодичні',
  offset: 'Зсув', freq: 'Частота', everyHours: 'Кожні N год', from: 'З', to: 'До', weekdays: 'Дні тижня', monthDays: 'Дні місяця',
  interval: 'Інтервал', count: 'Скільки разів', dates: 'Дати', at: 'Коли', timeOfDay: 'Час', offsetMin: 'За хвилин до',
};
