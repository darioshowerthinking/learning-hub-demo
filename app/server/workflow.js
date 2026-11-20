// Approval workflow for modules.
// draft -> submit -> in_review (all 4 teams pending)
//   any team "changes_requested" -> status changes_requested (back to the creator) once every team has answered
//   creator resubmits -> ALL FOUR reviews reset to pending (agreed rule)
//   all four "approved" -> approved (ready to go live)
//   Training Manager (admin) presses Go live -> published (only now do learners see it),
//   or requests changes -> changes_requested (and the module goes through all four teams again)
//
// Comments live in mod.comments (see public/js/studio-rules.js). Approvers see each other's comments as soon as
// they are written; a team's comments are "sent" with its decision, the Training Manager's when the round ends.

import { TEAMS } from './seed.js';
import { partPrints, roundComments } from '../public/js/studio-rules.js';

export class WorkflowError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const freshReviews = () => Object.fromEntries(TEAMS.map(team => [team, { state: 'pending' }]));
const teamComments = (mod, team) => roundComments(mod).filter(c => c.team === team || c.agrees?.some(a => a.team === team));

export function submit(mod, userId, now = Date.now()) {
  if (!['draft', 'changes_requested'].includes(mod.status)) {
    throw new WorkflowError(`A module in status "${mod.status}" cannot be submitted.`);
  }
  // Keep the previous round's decisions so approvers can check what was fixed.
  if (mod.reviews && Object.values(mod.reviews).some(r => r.state !== 'pending')) mod.lastRound = { round: mod.round || 1, reviews: mod.reviews };
  // Unsent drafts of the previous round are dropped; sent comments stay (with the creator's replies).
  mod.comments = (mod.comments || []).filter(c => c.sent);
  // Fingerprints of every part, so the next round can show what changed.
  if (mod.prints) mod.prevPrints = mod.prints;
  mod.prints = { round: (mod.round || 0) + 1, parts: partPrints(mod) };
  mod.round = (mod.round || 0) + 1;
  mod.status = 'in_review';
  mod.submittedAt = now;
  mod.reviews = freshReviews();
  mod.history = [...(mod.history || []), { at: now, by: userId, action: mod.round > 1 ? 'resubmitted' : 'submitted' }];
  return mod;
}

export function review(mod, { team, decision }, userId, now = Date.now()) {
  if (!TEAMS.includes(team)) throw new WorkflowError(`Unknown team "${team}".`);
  if (!['approved', 'changes_requested'].includes(decision)) throw new WorkflowError(`Unknown decision "${decision}".`);
  if (mod.status !== 'in_review') throw new WorkflowError('This module is not in review.');
  if (mod.reviews[team]?.state !== 'pending') throw new WorkflowError('Your team has already sent its decision for this round.', 409);
  const mine = teamComments(mod, team);
  if (decision === 'changes_requested' && !mine.length) {
    throw new WorkflowError('Requesting changes needs at least one comment for the creator (yours, or one you agreed with).');
  }
  for (const c of roundComments(mod)) if (c.team === team) { c.sent = true; c.sentAt = now; }
  mod.reviews[team] = { state: decision, at: now, by: userId, comments: mine.map(c => c.id) };
  mod.history = [...(mod.history || []), { at: now, by: userId, action: decision, team }];

  const states = TEAMS.map(t => mod.reviews[t]?.state);
  if (states.every(s => s === 'approved')) {
    mod.status = 'approved';
    mod.approvedAt = now;
    mod.history.push({ at: now, by: 'system', action: 'approved' });
  }
  return mod;
}

// The Training Manager sends an approved module back with their comments.
export function adminRequestChanges(mod, userId, now = Date.now()) {
  if (mod.status !== 'approved') throw new WorkflowError('The Training Manager can send a module back once all four teams have approved it.', 409);
  const mine = roundComments(mod).filter(c => c.team === 'admin');
  if (!mine.length) throw new WorkflowError('Add at least one comment for the creator first.');
  for (const c of mine) { c.sent = true; c.sentAt = now; }
  mod.status = 'changes_requested';
  mod.history = [...(mod.history || []), { at: now, by: userId, action: 'changes_requested', team: 'admin' }];
  return mod;
}

export function goLive(mod, userId, now = Date.now()) {
  if (mod.status !== 'approved') {
    throw new WorkflowError('Only a module approved by all four teams can go live.');
  }
  mod.status = 'published';
  mod.publishedAt = now;
  mod.history = [...(mod.history || []), { at: now, by: userId, action: 'went_live' }];
  return mod;
}

// Once every team has answered and at least one asked for changes, the module goes back.
// While some teams are still pending it stays in review, so each team's feedback is collected in one round.
// The Training Manager's comments from this round travel with it.
export function settle(mod, now = Date.now()) {
  if (mod.status !== 'in_review') return mod;
  const states = TEAMS.map(t => mod.reviews[t]?.state);
  if (!states.includes('pending') && states.includes('changes_requested')) {
    mod.status = 'changes_requested';
    for (const c of roundComments(mod)) if (c.team === 'admin') { c.sent = true; c.sentAt = now; }
  }
  return mod;
}
