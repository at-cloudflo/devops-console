import { Alert, AlertSeverity } from '../models/alert.model';

/**
 * Teams Incoming Webhook Service
 *
 * Sends alert notifications to a Microsoft Teams channel using an
 * Incoming Webhook connector (Adaptive Card format).
 *
 * Setup:
 *   Teams channel → Manage channel → Connectors → Incoming Webhook → Create
 *   Copy the generated URL into config.teamsNotifications.webhookUrl
 *   (or set TEAMS_WEBHOOK_URL env var as a fallback)
 */

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: 'attention',   // red in Adaptive Cards
  warning:  'warning',     // yellow
  info:     'accent',      // blue
};

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  critical: '🔴',
  warning:  '🟡',
  info:     '🔵',
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'CRITICAL',
  warning:  'WARNING',
  info:     'INFO',
};

const TYPE_LABEL: Record<string, string> = {
  pool_availability: 'Pool Availability',
  agent_offline:     'Agent Offline',
  queue_wait_time:   'Queue Wait Time',
  approval_age:      'Approval Pending',
  vertex_job_failed: 'Vertex AI Job Failed',
  system:            'System',
};

export type NotificationEvent = 'new' | 'escalated' | 'resolved';

function buildAdaptiveCard(alert: Alert, event: NotificationEvent): object {
  const color = event === 'resolved' ? 'good' : SEVERITY_COLOR[alert.severity];
  const emoji = event === 'resolved' ? '✅' : SEVERITY_EMOJI[alert.severity];
  const severityText = event === 'resolved'
    ? 'RESOLVED'
    : `${SEVERITY_LABEL[alert.severity]}${event === 'escalated' ? ' (escalated)' : ''}`;

  const title = `${emoji} ${TYPE_LABEL[alert.type] ?? alert.type} — ${severityText}`;
  const time = new Date().toLocaleString('en-GB', { timeZone: 'UTC', hour12: false });

  const facts = [
    { title: 'Source',   value: alert.source },
    { title: 'Message',  value: alert.message },
    { title: 'Time',     value: `${time} UTC` },
    { title: 'Alert ID', value: alert.id },
  ];

  // Add context-specific metadata facts
  if (alert.metadata.healthPercent !== undefined) {
    facts.push({ title: 'Availability', value: `${alert.metadata.healthPercent}%` });
  }
  if (alert.metadata.offlineMinutes !== undefined) {
    facts.push({ title: 'Offline for', value: `${alert.metadata.offlineMinutes} min` });
  }
  if (alert.metadata.waitMinutes !== undefined) {
    facts.push({ title: 'Waiting for', value: `${alert.metadata.waitMinutes} min` });
  }
  if (alert.metadata.ageHours !== undefined) {
    facts.push({ title: 'Pending for', value: `${alert.metadata.ageHours} hours` });
  }
  if (alert.metadata.pool) {
    facts.push({ title: 'Pool', value: String(alert.metadata.pool) });
  }
  if (alert.metadata.project) {
    facts.push({ title: 'Project', value: String(alert.metadata.project) });
  }
  if (alert.metadata.region) {
    facts.push({ title: 'Region', value: String(alert.metadata.region) });
  }

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: title,
              size: 'Medium',
              weight: 'Bolder',
              color,
              wrap: true,
            },
            {
              type: 'FactSet',
              facts,
            },
          ],
          msteams: { width: 'Full' },
        },
      },
    ],
  };
}

export async function sendTeamsAlert(
  alert: Alert,
  webhookUrl: string,
  event: NotificationEvent = 'new'
): Promise<void> {
  if (!webhookUrl) return;

  const payload = buildAdaptiveCard(alert, event);

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Teams webhook ${res.status} ${res.statusText}: ${body}`);
  }
}
