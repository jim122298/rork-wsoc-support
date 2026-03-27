import { Platform } from 'react-native';
import { ServiceInfo, ServiceStatusType } from '@/constants/serviceStatus';

type CheckStrategy = 'statuspage_api' | 'http_check';

interface ServiceConfig {
  id: string;
  name: string;
  iconUrl: string;
  strategy: CheckStrategy;
  checkUrl: string;
  statusApiUrl?: string;
  fallbackUrl?: string;
}

const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    id: 'outlook',
    name: 'Outlook',
    iconUrl: 'https://img.icons8.com/fluency/96/microsoft-outlook-2019.png',
    strategy: 'http_check',
    checkUrl: 'https://outlook.office365.com',
    fallbackUrl: 'https://login.microsoftonline.com',
  },
  {
    id: 'microsoft365',
    name: 'Microsoft 365',
    iconUrl: 'https://img.icons8.com/fluency/96/microsoft-365.png',
    strategy: 'http_check',
    checkUrl: 'https://www.office.com',
    fallbackUrl: 'https://login.microsoftonline.com',
  },
  {
    id: 'teams',
    name: 'Teams',
    iconUrl: 'https://img.icons8.com/fluency/96/microsoft-teams-2019.png',
    strategy: 'http_check',
    checkUrl: 'https://teams.microsoft.com',
    fallbackUrl: 'https://login.microsoftonline.com',
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    iconUrl: 'https://img.icons8.com/fluency/96/onedrive.png',
    strategy: 'http_check',
    checkUrl: 'https://onedrive.live.com',
    fallbackUrl: 'https://login.microsoftonline.com',
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    iconUrl: 'https://img.icons8.com/fluency/96/sharepoint.png',
    strategy: 'http_check',
    checkUrl: 'https://sharepoint.com',
    fallbackUrl: 'https://login.microsoftonline.com',
  },
  {
    id: 'paycom',
    name: 'Paycom',
    iconUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/ca/62/0a/ca620a7c-0379-b926-a834-e7c6f4bab305/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/246x0w.webp',
    strategy: 'http_check',
    checkUrl: 'https://www.paycom.com',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    iconUrl: 'https://img.icons8.com/fluency/96/zoom.png',
    strategy: 'statuspage_api',
    checkUrl: 'https://zoom.us',
    statusApiUrl: 'https://status.zoom.us/api/v2/status.json',
  },
  {
    id: 'relias',
    name: 'Relias',
    iconUrl: 'https://img.icons8.com/fluency/96/graduation-cap.png',
    strategy: 'http_check',
    checkUrl: 'https://www.relias.com',
  },
  {
    id: 'carelogic',
    name: 'CareLogic',
    iconUrl: 'https://img.icons8.com/fluency/96/health-book.png',
    strategy: 'http_check',
    checkUrl: 'https://www.qualifacts.com',
  },
];

const TIMEOUT_MS = 12000;

interface StatuspageApiResponse {
  status?: {
    indicator?: string;
    description?: string;
  };
}

function parseStatuspageIndicator(indicator: string): ServiceStatusType {
  switch (indicator) {
    case 'none':
      return 'operational';
    case 'minor':
      return 'degraded';
    case 'major':
    case 'critical':
      return 'down';
    default:
      return 'degraded';
  }
}

function getNote(status: ServiceStatusType, description?: string): string {
  if (description) return description;
  switch (status) {
    case 'operational':
      return 'All systems normal';
    case 'degraded':
      return 'Performance issues detected';
    case 'down':
      return 'Service unreachable';
  }
}

function getLastIncident(status: ServiceStatusType): string {
  switch (status) {
    case 'operational':
      return 'No recent incidents';
    case 'degraded':
      return `Issue detected at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    case 'down':
      return `Unreachable as of ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function getRecommendedAction(status: ServiceStatusType): string {
  switch (status) {
    case 'operational':
      return 'No action needed';
    case 'degraded':
      return 'Try again later or use the web client';
    case 'down':
      return 'Submit a ticket if issue continues';
  }
}

async function checkViaStatuspageApi(config: ServiceConfig): Promise<ServiceInfo> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startTime = Date.now();

  try {
    console.log(`[ServiceStatus] Fetching status API for ${config.name}: ${config.statusApiUrl}`);

    const response = await fetch(config.statusApiUrl!, {
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.log(`[ServiceStatus] Status API returned HTTP ${response.status} for ${config.name}, falling back to HTTP check`);
      return checkViaHttp(config);
    }

    const data: StatuspageApiResponse = await response.json();
    const indicator = data.status?.indicator || 'none';
    const description = data.status?.description || '';
    const status = parseStatuspageIndicator(indicator);

    console.log(`[ServiceStatus] ${config.name} status API: indicator=${indicator}, status=${status}, desc="${description}"`);

    return {
      id: config.id,
      name: config.name,
      iconUrl: config.iconUrl,
      status,
      responseTime,
      note: getNote(status, description || undefined),
      lastIncident: getLastIncident(status),
      recommendedAction: getRecommendedAction(status),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.log(`[ServiceStatus] Status API failed for ${config.name}: ${error?.message}, falling back to HTTP check`);
    return checkViaHttp(config);
  }
}

async function checkViaHttp(config: ServiceConfig): Promise<ServiceInfo> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startTime = Date.now();

  try {
    const isWeb = Platform.OS === 'web';

    const fetchOptions: RequestInit = {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
      ...(isWeb ? { mode: 'no-cors' as RequestMode } : {}),
    };

    console.log(`[ServiceStatus] HTTP check for ${config.name}: ${config.checkUrl}`);

    let response: Response;
    try {
      response = await fetch(config.checkUrl, fetchOptions);
    } catch {
      const getOptions: RequestInit = {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        ...(isWeb ? { mode: 'no-cors' as RequestMode } : {}),
      };
      const urlToTry = config.fallbackUrl || config.checkUrl;
      console.log(`[ServiceStatus] HEAD failed for ${config.name}, trying GET on ${urlToTry}`);
      response = await fetch(urlToTry, getOptions);
    }

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    let status: ServiceStatusType;
    if (isWeb) {
      status = 'operational';
    } else {
      const isUp = response.ok || response.status < 500;
      status = isUp ? 'operational' : 'down';
    }

    console.log(`[ServiceStatus] ${config.name}: ${status} (${responseTime}ms, HTTP ${response.status}, type: ${response.type})`);

    return {
      id: config.id,
      name: config.name,
      iconUrl: config.iconUrl,
      status,
      responseTime,
      note: getNote(status),
      lastIncident: getLastIncident(status),
      recommendedAction: getRecommendedAction(status),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const isTimeout = error?.name === 'AbortError';

    console.log(`[ServiceStatus] ${config.name} failed: ${error?.message} (timeout=${isTimeout}, ${responseTime}ms)`);

    if (config.fallbackUrl) {
      try {
        console.log(`[ServiceStatus] Trying fallback for ${config.name}: ${config.fallbackUrl}`);
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), TIMEOUT_MS);
        const fallbackStart = Date.now();
        const isWeb = Platform.OS === 'web';

        const fallbackResponse = await fetch(config.fallbackUrl, {
          method: 'GET',
          signal: fallbackController.signal,
          cache: 'no-store',
          ...(isWeb ? { mode: 'no-cors' as RequestMode } : {}),
        });

        clearTimeout(fallbackTimeout);
        const fallbackTime = Date.now() - fallbackStart;

        let fallbackStatus: ServiceStatusType;
        if (isWeb) {
          fallbackStatus = 'operational';
        } else {
          fallbackStatus = (fallbackResponse.ok || fallbackResponse.status < 500) ? 'operational' : 'down';
        }

        console.log(`[ServiceStatus] ${config.name} fallback: ${fallbackStatus} (${fallbackTime}ms)`);

        return {
          id: config.id,
          name: config.name,
          iconUrl: config.iconUrl,
          status: fallbackStatus,
          responseTime: fallbackTime,
          note: getNote(fallbackStatus),
          lastIncident: getLastIncident(fallbackStatus),
          recommendedAction: getRecommendedAction(fallbackStatus),
        };
      } catch {
        console.log(`[ServiceStatus] ${config.name} fallback also failed`);
      }
    }

    return {
      id: config.id,
      name: config.name,
      iconUrl: config.iconUrl,
      status: 'down',
      responseTime: isTimeout ? responseTime : 0,
      note: isTimeout ? 'Connection timed out' : 'Service unreachable',
      lastIncident: getLastIncident('down'),
      recommendedAction: getRecommendedAction('down'),
    };
  }
}

async function checkSingleService(config: ServiceConfig): Promise<ServiceInfo> {
  if (config.strategy === 'statuspage_api' && config.statusApiUrl) {
    return checkViaStatuspageApi(config);
  }
  return checkViaHttp(config);
}

export async function checkAllServices(): Promise<ServiceInfo[]> {
  console.log('[ServiceStatus] Starting status checks for all services...');

  const results = await Promise.allSettled(
    SERVICE_CONFIGS.map((config) => checkSingleService(config))
  );

  const services: ServiceInfo[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const config = SERVICE_CONFIGS[index];
    console.error(`[ServiceStatus] Unexpected error for ${config.name}:`, result.reason);
    return {
      id: config.id,
      name: config.name,
      iconUrl: config.iconUrl,
      status: 'down' as ServiceStatusType,
      responseTime: 0,
      note: 'Service unreachable',
      lastIncident: 'Check failed unexpectedly',
      recommendedAction: 'Submit a ticket if issue continues',
    };
  });

  console.log('[ServiceStatus] All checks complete:', services.map((s) => `${s.name}=${s.status}`).join(', '));
  return services;
}
