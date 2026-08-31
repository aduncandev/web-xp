/*
 * Applies the retention policy once and reports what went.
 *
 * The server already does this every six hours; this is for running it by
 * hand, or from cron if you would rather own the schedule.
 *
 *   node --env-file=.env scripts/purge.js
 */
import { purge } from '../src/db.js';

const r = purge();
console.log(
  `raw IPs cleared:      ${r.rawIps}\n` +
    `rejected/blocked cut: ${r.rejected}\n` +
    `attempts cut:         ${r.attempts}\n` +
    `spent challenges cut: ${r.challenges}`,
);
