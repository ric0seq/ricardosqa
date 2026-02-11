const PARALLEL_API_BASE = "https://api.parallel.ai/v1alpha";

function getApiKey(): string {
  const key = process.env.PARALLEL_API_KEY;
  if (!key) {
    throw new Error("PARALLEL_API_KEY environment variable is not set");
  }
  return key;
}

function getWebhookUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL or NEXTAUTH_URL environment variable is not set"
    );
  }
  return `${baseUrl}/api/linkedin-tracker/webhook`;
}

interface CreateMonitorParams {
  personName: string;
  linkedinUrl: string;
  category: string;
  /** Metadata passed through to webhook payloads for routing */
  metadata?: Record<string, string>;
}

interface MonitorResponse {
  monitor_id: string;
  query: string;
  status: string;
  cadence: string;
  metadata: Record<string, string>;
  webhook: {
    url: string;
    event_types: string[];
  };
  created_at: string;
}

interface EventGroupResponse {
  events: Array<{
    type: string;
    event_group_id: string;
    output: string;
    event_date: string;
    source_urls: string[];
  }>;
}

export async function createMonitor(
  params: CreateMonitorParams
): Promise<MonitorResponse> {
  const { personName, linkedinUrl, category } = params;

  const categoryDescription =
    category === "founder_in_stealth"
      ? "They are currently a founder in stealth mode. Alert me when they announce a new company, launch a product, or make their venture public."
      : "They are an operator at an established company. Alert me when they leave their current company, change roles, move to a new company, or go into stealth mode to start something new.";

  const query = `Monitor LinkedIn profile changes for ${personName} (${linkedinUrl}). ${categoryDescription} Report any changes to their job title, company, role description, or professional status. Include details about what changed and links to sources.`;

  const response = await fetch(`${PARALLEL_API_BASE}/monitors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      query,
      cadence: "weekly",
      webhook: {
        url: getWebhookUrl(),
        event_types: ["monitor.event.detected"],
      },
      metadata: {
        ...params.metadata,
        person_name: personName,
        linkedin_url: linkedinUrl,
        category,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Parallel API error (${response.status}): ${errorBody}`
    );
  }

  return response.json();
}

export async function deleteMonitor(monitorId: string): Promise<void> {
  const response = await fetch(
    `${PARALLEL_API_BASE}/monitors/${monitorId}`,
    {
      method: "DELETE",
      headers: {
        "x-api-key": getApiKey(),
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Parallel API error (${response.status}): ${errorBody}`
    );
  }
}

export async function getMonitor(
  monitorId: string
): Promise<MonitorResponse> {
  const response = await fetch(
    `${PARALLEL_API_BASE}/monitors/${monitorId}`,
    {
      method: "GET",
      headers: {
        "x-api-key": getApiKey(),
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Parallel API error (${response.status}): ${errorBody}`
    );
  }

  return response.json();
}

export async function getEventGroup(
  monitorId: string,
  eventGroupId: string
): Promise<EventGroupResponse> {
  const response = await fetch(
    `${PARALLEL_API_BASE}/monitors/${monitorId}/event_groups/${eventGroupId}`,
    {
      method: "GET",
      headers: {
        "x-api-key": getApiKey(),
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Parallel API error (${response.status}): ${errorBody}`
    );
  }

  return response.json();
}

export async function listMonitors(): Promise<MonitorResponse[]> {
  const response = await fetch(`${PARALLEL_API_BASE}/monitors`, {
    method: "GET",
    headers: {
      "x-api-key": getApiKey(),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Parallel API error (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return data.monitors || data;
}
