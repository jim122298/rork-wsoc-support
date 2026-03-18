import { Platform } from 'react-native';
import { ServiceInfo, ServiceStatusType } from '@/constants/serviceStatus';

interface ServiceConfig {
  id: string;
  name: string;
  iconUrl: string;
  checkUrl: string;
  fallbackUrl?: string;
}

const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    id: 'outlook',
    name: 'Outlook',
    iconUrl: 'https://img.icons8.com/fluency/96/microsoft-outlook-2019.png',
    checkUrl: 'https://outlook.office365.com',
    fallbackUrl: 'https://outlook.live.com',
  },
  {
    id: 'microsoft365',
    name: 'Microsoft 365',
    iconUrl: 'https://img.icons8.com/fluency/96/microsoft-365.png',
    checkUrl: 'https://www.office.com',
    fallbackUrl: 'https://login.microsoftonline.com',
  },
  {
    id: 'teams',
    name: 'Teams',
    iconUrl: 'https://img.icons8.com/fluency/96/microsoft-teams-2019.png',
    checkUrl: 'https://teams.microsoft.com',
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    iconUrl: 'https://img.icons8.com/fluency/96/onedrive.png',
    checkUrl: 'https://onedrive.live.com',
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    iconUrl: 'https://img.icons8.com/fluency/96/sharepoint.png',
    checkUrl: 'https://sharepoint.com',
    fallbackUrl: 'https://www.microsoft.com/en-us/microsoft-365/sharepoint/collaboration',
  },
  {
    id: 'paycom',
    name: 'Paycom',
    iconUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/ca/62/0a/ca620a7c-0379-b926-a834-e7c6f4bab305/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/246x0w.webp',
    checkUrl: 'https://www.paycom.com',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    iconUrl: 'https://img.icons8.com/fluency/96/zoom.png',
    checkUrl: 'https://zoom.us',
    fallbackUrl: 'https://status.zoom.us',
  },
  {
    id: 'relias',
    name: 'Relias',
    iconUrl: 'https://img.icons8.com/fluency/96/graduation-cap.png',
    checkUrl: 'https://www.relias.com',
  },
  {
    id: 'carlogic',
    name: 'CarLogic',
    iconUrl: 'https://img.icons8.com/fluency/96/car.png',
    checkUrl: 'https://carlogic.com',
  },
];

const TIMEOUT_MS = 10000;
const DEGRADED_THRESHOLD_MS = 2000;

function getNote(status: ServiceStatusType, responseTime: number): string {
  switch (status) {
    case 'operational':
      return 'All systems normal';
    case 'degraded':
      return responseTime > 0
        ? `Slow response detected (${responseTime}ms)`
        : 'Intermittent connectivity';
    case 'down':
      return 'Service unreachable';
  }
}

function getLastIncident(status: ServiceStatusType): string {
  switch (status) {
    case 'operational':
      return 'No recent incidents';
    case 'degraded':
      return `High latency detected at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    case 'down':
      return `Service unreachable as of ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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

async function checkSingleService(config: ServiceConfig): Promise<ServiceInfo> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const fetchOptions: RequestInit = {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    };

    if (Platform.OS === 'web') {
      (fetchOptions as any).mode = 'no-cors';
    }

    console.log(`[ServiceStatus] Checking ${config.name} at ${config.checkUrl}`);

    let response: Response;
    try {
      response = await fetch(config.checkUrl, fetchOptions);
    } catch {
      console.log(`[ServiceStatus] HEAD failed for ${config.name}, trying GET...`);
      const getOptions: RequestInit = {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      };
      if (Platform.OS === 'web') {
        (getOptions as any).mode = 'no-cors';
      }

      const urlToTry = config.fallbackUrl || config.checkUrl;
      response = await fetch(urlToTry, getOptions);
    }

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const isOpaque = response.type === 'opaque';
    const isOk = response.ok || isOpaque || response.status === 0;

    let status: ServiceStatusType;
    if (!isOk) {
      status = 'down';
    } else if (responseTime > DEGRADED_THRESHOLD_MS) {
      status = 'degraded';
    } else {
      status = 'operational';
    }

    console.log(`[ServiceStatus] ${config.name}: ${status} (${responseTime}ms, HTTP ${response.status}, type: ${response.type})`);

    return {
      id: config.id,
      name: config.name,
      iconUrl: config.iconUrl,
      status,
      responseTime,
      note: getNote(status, responseTime),
      lastIncident: getLastIncident(status),
      recommendedAction: getRecommendedAction(status),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const isTimeout = error?.name === 'AbortError';

    const status: ServiceStatusType = isTimeout ? 'degraded' : 'down';
    console.log(`[ServiceStatus] ${config.name}: ${status} (error: ${error?.message}, ${responseTime}ms)`);

    if (!isTimeout && config.fallbackUrl) {
      try {
        console.log(`[ServiceStatus] Trying fallback for ${config.name}: ${config.fallbackUrl}`);
        const fallbackStart = Date.now();
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), TIMEOUT_MS);

        const fallbackOptions: RequestInit = {
          method: 'GET',
          signal: fallbackController.signal,
          cache: 'no-store',
        };
        if (Platform.OS === 'web') {
          (fallbackOptions as any).mode = 'no-cors';
        }

        const fallbackResponse = await fetch(config.fallbackUrl, fallbackOptions);
        clearTimeout(fallbackTimeout);
        const fallbackTime = Date.now() - fallbackStart;

        const fallbackOk = fallbackResponse.ok || fallbackResponse.type === 'opaque' || fallbackResponse.status === 0;

        if (fallbackOk) {
          const fallbackStatus: ServiceStatusType = fallbackTime > DEGRADED_THRESHOLD_MS ? 'degraded' : 'operational';
          console.log(`[ServiceStatus] ${config.name} fallback: ${fallbackStatus} (${fallbackTime}ms)`);
          return {
            id: config.id,
            name: config.name,
            iconUrl: config.iconUrl,
            status: fallbackStatus,
            responseTime: fallbackTime,
            note: getNote(fallbackStatus, fallbackTime),
            lastIncident: getLastIncident(fallbackStatus),
            recommendedAction: getRecommendedAction(fallbackStatus),
          };
        }
      } catch {
        console.log(`[ServiceStatus] ${config.name} fallback also failed`);
      }
    }

    return {
      id: config.id,
      name: config.name,
      iconUrl: config.iconUrl,
      status,
      responseTime: isTimeout ? responseTime : 0,
      note: getNote(status, isTimeout ? responseTime : 0),
      lastIncident: getLastIncident(status),
      recommendedAction: getRecommendedAction(status),
    };
  }
}

export async function checkAllServices(): Promise<ServiceInfo[]> {
  console.log('[ServiceStatus] Starting live checks for all services...');
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

  console.log('[ServiceStatus] All checks complete:', services.map(s => `${s.name}=${s.status}`).join(', '));
  return services;
}
