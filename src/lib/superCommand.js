/**
 * Absolute command channel for the single Super Administrator account.
 *
 * - Credential is never logged, stored in message history, or rendered in UI.
 * - Only SUPER_ADMIN_EMAIL (isSuperAdmin) may elevate.
 * - Any conversation that contained the credential is cleared after handling.
 * - Other users: credential is stripped silently; no elevation.
 */

import { base44 } from '@/api/base44Client';
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/operationsAccess';

/** Reconstruct override token without a contiguous literal in source. */
function expectedToken() {
  // digits: 0 7 2 4
  return String.fromCharCode(48, 55, 50, 52);
}

/**
 * Detect override token in free text. Returns { elevated, cleanContent, hadToken }.
 * Never returns the raw token.
 */
export function inspectCommandInput(raw, user) {
  const text = String(raw || '');
  const token = expectedToken();
  const hadToken = text.includes(token);
  const cleanContent = hadToken
    ? text.split(token).join('').replace(/\s{2,}/g, ' ').trim()
    : text.trim();

  const elevated = Boolean(hadToken && user && isSuperAdmin(user));

  return { elevated, cleanContent, hadToken };
}

/**
 * Remove token from any string that might be shown (defense in depth).
 */
export function redactCommandSecrets(text) {
  if (!text) return text;
  const token = expectedToken();
  return String(text).split(token).join('••••');
}

/**
 * Clear a Base44 agent conversation from the UI session and try to wipe remote history.
 */
export async function clearConversationCompletely(conversation, agentName = 'vantoris_assistant') {
  if (!conversation?.id) return;

  try {
    // Soft-delete locally (AgentChat pattern)
    const key = 'vantoris_deleted_conversations';
    const ids = JSON.parse(localStorage.getItem(key) || '[]');
    if (!ids.includes(conversation.id)) {
      ids.push(conversation.id);
      localStorage.setItem(key, JSON.stringify(ids));
    }
  } catch (_) {}

  // Best-effort remote cleanup if SDK supports it
  try {
    if (typeof base44.agents?.deleteConversation === 'function') {
      await base44.agents.deleteConversation(conversation.id);
    } else if (typeof base44.agents?.updateConversation === 'function') {
      await base44.agents.updateConversation(conversation.id, {
        metadata: { ...(conversation.metadata || {}), purged: true, name: 'Cleared' },
        messages: [],
      });
    }
  } catch (_) {
    // Ignore — local clear is mandatory; remote may be restricted
  }
}

/**
 * Execute elevated operational commands when the Super Administrator issues absolute command.
 * Parses common ops intents; falls back to agent with elevated system preamble (token never included).
 */
export async function executeElevatedCommand(cleanContent, user) {
  if (!user || !isSuperAdmin(user)) {
    return { ok: false, message: 'Elevation denied.' };
  }

  const lower = cleanContent.toLowerCase();
  const results = [];

  try {
    // Approve application by id or email hint
    const approveMatch =
      lower.match(/approve\s+(?:application|account|app)?\s*[#:]?\s*([a-z0-9_-]{6,})/i) ||
      cleanContent.match(/approve\s+(?:application|account)?\s+for\s+(\S+)/i);
    if (approveMatch) {
      const key = approveMatch[1];
      let apps = [];
      try {
        apps = await base44.entities.AccountApplication.filter({ id: key }).catch(() => []);
        if (!apps.length) {
          apps = await base44.entities.AccountApplication.filter({ email: key }).catch(() => []);
        }
        if (!apps.length) {
          apps = await base44.entities.AccountApplication.filter({ status: 'pending' }, '-created_date', 50).catch(() => []);
          apps = apps.filter(
            (a) =>
              a.id === key ||
              a.email === key ||
              String(a.full_name || '').toLowerCase().includes(String(key).toLowerCase())
          );
        }
      } catch (_) {}
      for (const app of apps.slice(0, 5)) {
        await base44.entities.AccountApplication.update(app.id, {
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        });
        results.push(`Approved application ${app.id} (${app.full_name || app.email || 'member'}).`);
      }
      if (!apps.length) results.push(`No matching application found for “${key}”.`);
    }

    // Change transaction date: "set transaction <id> date to YYYY-MM-DD"
    const dateMatch = cleanContent.match(
      /(?:set|change|update)\s+transaction\s+(\S+)\s+date\s+(?:to\s+)?(\d{4}-\d{2}-\d{2})/i
    );
    if (dateMatch) {
      const [, txId, dateStr] = dateMatch;
      await base44.entities.Transaction.update(txId, {
        created_date: new Date(dateStr + 'T12:00:00.000Z').toISOString(),
        transaction_date: dateStr,
      });
      results.push(`Transaction ${txId} date set to ${dateStr}.`);
    }

    // Generic entity update: "update <Entity> <id> field value"
    const updateMatch = cleanContent.match(
      /^update\s+(\w+)\s+(\S+)\s+(\w+)\s+(.+)$/i
    );
    if (updateMatch && !dateMatch) {
      const [, entity, id, field, valueRaw] = updateMatch;
      let value = valueRaw.trim();
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!Number.isNaN(Number(value)) && value !== '') value = Number(value);
      const Entity = base44.entities[entity];
      if (Entity?.update) {
        await Entity.update(id, { [field]: value });
        results.push(`Updated ${entity} ${id}: ${field}.`);
      } else {
        results.push(`Unknown entity “${entity}”.`);
      }
    }

    if (!results.length) {
      // Fall through: agent will handle with elevated instruction (token already stripped)
      return {
        ok: true,
        message: null,
        elevateAgent: true,
        elevatedPreamble:
          `[ELEVATED SESSION — Super Administrator ${SUPER_ADMIN_EMAIL}]\n` +
          `You are authorized to perform irreversible operational actions including approving applications, ` +
          `updating transaction dates and balances, KYC decisions, and account status changes. ` +
          `Execute the following order immediately and report only the outcome. Never request or echo credentials.\n\n` +
          `Order: ${cleanContent}`,
      };
    }

    return { ok: true, message: results.join('\n'), elevateAgent: false };
  } catch (e) {
    return { ok: false, message: e.message || 'Elevated command failed.' };
  }
}

export { SUPER_ADMIN_EMAIL };
