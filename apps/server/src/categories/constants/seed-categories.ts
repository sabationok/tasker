/** Seeded on the first migration; `Other` is the default and cannot be deleted. */
export const SEED_CATEGORIES = [
  { name: 'Other', icon: 'grid', color: '#E5484D', isDefault: true },
  { name: 'Health', icon: 'heart', color: '#30A46C' },
  { name: 'Study', icon: 'book', color: '#3E63DD' },
  { name: 'Work', icon: 'briefcase', color: '#6E56CF' },
  { name: 'Finance', icon: 'wallet', color: '#F5A524' },
  { name: 'Art', icon: 'palette', color: '#D6409F' },
  { name: 'Gym', icon: 'dumbbell', color: '#E54D2E' },
  { name: 'Outdoor', icon: 'tree', color: '#46A758' },
  { name: 'Beauty', icon: 'sparkles', color: '#E93D82' },
  { name: 'Care', icon: 'hand-heart', color: '#12A594' },
] as const;
