import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { instantOf, localDateOf } from '../../../../common/helpers/local-date';
import { EventsService } from '../../../../events/events.service';
import { ItemThreadsService } from '../../../../items/services/item-threads';
import { ItemsService } from '../../../../items/services/items';
import { SettingsService } from '../../../../settings/settings.service';
import { TodayService } from '../../../../today/services/today';
import { RemindersService } from '../../../reminders.service';
import { reminderAssignmentOf as assignmentOf } from './helpers/reminder-assignment';

const LATE_AFTER_MS = 5 * 60_000;

/**
 * Every minute: fires due reminders as `reminder.due` to every key with an `events_url`. One-off (`at` / `offsetMin`)
 * fire once; daily (`timeOfDay`) once per local day while the owner is on today's plan and not done / skipped.
 * `lastFiredAt` is claimed before the event is queued, so a restart never sends one twice.
 */
@Injectable()
export class ReminderSweepService {
  private readonly _logger = new Logger(ReminderSweepService.name);
  private _running = false;

  constructor(
    private readonly _reminders: RemindersService,
    private readonly _items: ItemsService,
    private readonly _threads: ItemThreadsService,
    private readonly _today: TodayService,
    private readonly _settings: SettingsService,
    private readonly _events: EventsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this._running) return;
    this._running = true;
    try {
      const fired = (await this.sweepOneOff(new Date())) + (await this.sweepDaily(new Date()));
      if (fired) this._logger.log(`reminders fired: ${fired}`);
    } catch (e) {
      this._logger.error((e as Error).message);
    } finally {
      this._running = false;
    }
  }

  async sweepOneOff(now: Date): Promise<number> {
    const due = await this._reminders.findDueOneOff(now);
    if (!due.length) return 0;
    const items = new Map((await this._items.findByIds([...new Set(due.map((d) => d.itemId))])).map((i) => [i.id, i]));
    const locked = await this._threads.lockedIds([...items.values()]);
    let fired = 0;
    for (const r of due) {
      const item = items.get(r.itemId);
      if (item && locked.has(r.itemId)) continue; // a locked thread step: re-checked each minute, fires (late) once unlocked
      const skip = !item || item.status === 'done' || item.status === 'archived';
      if (!(await this._reminders.claimFiring(r.id, now, null)) || skip || !item) continue;
      await this._events.emitToAll({ connector: 'tasker', type: 'reminder.due', reminderId: r.id, itemId: item.id, title: item.title, at: r.dueAt.toISOString(), late: now.getTime() - r.dueAt.getTime() > LATE_AFTER_MS, ...assignmentOf(item) });
      fired += 1;
    }
    return fired;
  }

  async sweepDaily(now: Date): Promise<number> {
    const settings = await this._settings.get();
    const tz = settings.timezone;
    const day = localDateOf(now, tz);
    const midnight = instantOf(day, '00:00', tz);
    const due = (await this._reminders.findDailyNotFiredSince(midnight))
      .map((r) => ({ r, at: instantOf(day, (r.timeOfDay as string).slice(0, 5), tz) }))
      .filter((x) => x.at.getTime() <= now.getTime());
    if (!due.length) return 0;
    const view = await this._today.get(day, { apiKeyId: null, agentSlug: null, timeZone: tz, locale: settings.locale, now });
    const open = new Map<string, string>();
    for (const e of view.entries) {
      const owner = e.habitId ?? e.itemId;
      if (owner && !e.done && !e.status) open.set(owner, e.title);
    }
    const agentItems = new Map((await this._items.findByIds([...new Set(due.map((x) => x.r.itemId).filter((x): x is string => !!x))])).map((i) => [i.id, i]));
    let fired = 0;
    for (const { r, at } of due) {
      const owner = r.habitId ?? r.itemId;
      const title = owner ? open.get(owner) : undefined;
      if (!title || !(await this._reminders.claimFiring(r.id, now, midnight))) continue;
      await this._events.emitToAll({ connector: 'tasker', type: 'reminder.due', reminderId: r.id, ...(r.itemId && { itemId: r.itemId }), ...(r.habitId && { habitId: r.habitId }), title, at: at.toISOString(), late: now.getTime() - at.getTime() > LATE_AFTER_MS, ...(r.itemId && assignmentOf(agentItems.get(r.itemId))) });
      fired += 1;
    }
    return fired;
  }
}
