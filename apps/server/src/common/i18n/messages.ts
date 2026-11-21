import type { ErrorCode } from '../http/error-codes';

export type Locale = 'uk' | 'en';

const MESSAGES: Partial<Record<ErrorCode, Record<Locale, string>>> = {
  'invalid:args': { uk: 'Некоректне значення', en: 'Invalid value' },
  'invalid:item:remind-at-past': { uk: 'Час нагадування вже минув', en: 'The reminder time is in the past' },
  'invalid:item:thread-locked': { uk: 'Спершу виконай попередній крок потоку', en: 'Finish the previous thread first' },
  'invalid:item:thread-periodic': { uk: 'Періодичну задачу не можна ділити на потоки', en: 'A periodic task cannot have threads' },
  'invalid:item:type-unsupported': { uk: 'Для ідеї чи нотатки це недоступно', en: 'Not available for an idea or a note' },
  'invalid:item:connector-tools': { uk: 'Задача для конектора: потрібні агент-виконавець, конектор і його тулзи', en: "A connector to-do needs an agent assignee, the connector and its tools" },
  'invalid:recurrence:freq': { uk: 'Невідома частота', en: 'Unknown frequency' },
  'invalid:recurrence:startsOn': { uk: 'Потрібна дата початку', en: 'A start date is required' },
  'invalid:recurrence:weekdays': { uk: 'Вкажи дні тижня', en: 'Pick weekdays' },
  'invalid:recurrence:monthDays': { uk: 'Вкажи дні місяця', en: 'Pick days of month' },
  'invalid:recurrence:interval': { uk: 'Інтервал має бути від 2 днів', en: 'The interval must be at least 2 days' },
  'invalid:recurrence:dates': { uk: 'Вкажи дати у форматі ММ-ДД', en: 'Give dates as MM-DD' },
  'invalid:recurrence:range': { uk: 'Дата завершення раніше за початок', en: 'The end date is before the start' },
  'invalid:habit:target': { uk: 'Для цього типу звички потрібна ціль', en: 'This habit type needs a target' },
  'invalid:habit:date': { uk: 'Цього дня звичка не запланована', en: 'The habit is not scheduled on that day' },
  'invalid:habit:notes-disabled': { uk: 'Нотатки для цієї звички вимкнено', en: 'Notes are off for this habit' },
  'not-found:project': { uk: 'Проєкт не знайдено', en: 'Project not found' },
  'not-found:category': { uk: 'Категорію не знайдено', en: 'Category not found' },
  'not-found:tag': { uk: 'Тег не знайдено', en: 'Tag not found' },
  'not-found:item': { uk: 'Запис не знайдено', en: 'Item not found' },
  'not-found:habit': { uk: 'Звичку не знайдено', en: 'Habit not found' },
  'not-found:checklist-item': { uk: 'Пункт чекліста не знайдено', en: 'Checklist item not found' },
  'not-found:reminder': { uk: 'Нагадування не знайдено', en: 'Reminder not found' },
  'not-found:draft': { uk: 'Чернетку не знайдено', en: 'Draft not found' },
  'not-found:api-key': { uk: 'Ключ не знайдено', en: 'API key not found' },
  'not-found:tool': { uk: 'Невідомий інструмент', en: 'Unknown tool' },
  'not-found:agent': { uk: 'Агента не знайдено', en: 'Agent not found' },
  'forbidden:not-an-agent': { uk: 'Це доступно лише агенту', en: 'Only an agent can do this' },
  'forbidden:not-assigned': { uk: 'Цей запис призначено не тобі', en: 'This item is not assigned to you' },
  'conflict:draft:not-pending': { uk: 'Чернетку вже збережено, відхилено або вона застаріла', en: 'The draft is already saved, discarded or expired' },
  'unauthorized:api-key': { uk: 'Потрібен дійсний API-ключ', en: 'A valid API key is required' },
  internal: { uk: 'Внутрішня помилка', en: 'Internal error' },
};

/** Localized message for an error code (uk default). */
export function msg(locale: Locale, code: ErrorCode): string {
  return MESSAGES[code]?.[locale] ?? MESSAGES[code]?.en ?? code;
}

export function toLocale(value: string | undefined | null): Locale {
  return value && value.toLowerCase().startsWith('en') ? 'en' : 'uk';
}
