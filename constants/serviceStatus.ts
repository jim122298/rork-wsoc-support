export type ServiceStatusType = 'operational' | 'degraded' | 'down';

export interface ServiceInfo {
  id: string;
  name: string;
  iconUrl: string;
  status: ServiceStatusType;
  responseTime: number;
  note: string;
  lastIncident: string;
  recommendedAction: string;
}

export const MOCK_SERVICES: ServiceInfo[] = [
  {
    id: 'outlook',
    name: 'Outlook',
    iconUrl: 'https://img.icons8.com/color/96/microsoft-outlook-2019.png',
    status: 'operational',
    responseTime: 42,
    note: 'All systems normal',
    lastIncident: 'No recent incidents',
    recommendedAction: 'No action needed',
  },
  {
    id: 'microsoft365',
    name: 'Microsoft 365',
    iconUrl: 'https://img.icons8.com/color/96/microsoft-365.png',
    status: 'operational',
    responseTime: 58,
    note: 'All systems normal',
    lastIncident: 'No recent incidents',
    recommendedAction: 'No action needed',
  },
  {
    id: 'teams',
    name: 'Teams',
    iconUrl: 'https://img.icons8.com/color/96/microsoft-teams.png',
    status: 'degraded',
    responseTime: 320,
    note: 'Slow response detected',
    lastIncident: 'Intermittent latency reported since 9:15 AM',
    recommendedAction: 'Try again later or use the web client',
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    iconUrl: 'https://img.icons8.com/color/96/one-drive.png',
    status: 'operational',
    responseTime: 67,
    note: 'All systems normal',
    lastIncident: 'No recent incidents',
    recommendedAction: 'No action needed',
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    iconUrl: 'https://img.icons8.com/color/96/sharepoint.png',
    status: 'operational',
    responseTime: 89,
    note: 'All systems normal',
    lastIncident: 'No recent incidents',
    recommendedAction: 'No action needed',
  },
  {
    id: 'paycom',
    name: 'Paycom',
    iconUrl: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ea/47/9a/ea479a69-39ce-32fc-87d5-7f0971f0bd34/Placeholder.mill/400x400bb-75.webp',
    status: 'operational',
    responseTime: 110,
    note: 'All systems normal',
    lastIncident: 'No recent incidents',
    recommendedAction: 'No action needed',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    iconUrl: 'https://img.icons8.com/color/96/zoom.png',
    status: 'down',
    responseTime: 0,
    note: 'Service unreachable',
    lastIncident: 'Major outage reported at 8:00 AM',
    recommendedAction: 'Submit a ticket if issue continues',
  },
  {
    id: 'relias',
    name: 'Relias',
    iconUrl: 'https://img.icons8.com/color/96/training.png',
    status: 'operational',
    responseTime: 145,
    note: 'All systems normal',
    lastIncident: 'No recent incidents',
    recommendedAction: 'No action needed',
  },
  {
    id: 'carlogic',
    name: 'CarLogic',
    iconUrl: 'https://img.icons8.com/color/96/car.png',
    status: 'operational',
    responseTime: 98,
    note: 'All systems normal',
    lastIncident: 'No recent incidents',
    recommendedAction: 'No action needed',
  },
];

export function getStatusColor(status: ServiceStatusType): string {
  switch (status) {
    case 'operational':
      return '#34C759';
    case 'degraded':
      return '#FF9500';
    case 'down':
      return '#FF3B30';
  }
}

export function getStatusLabel(status: ServiceStatusType): string {
  switch (status) {
    case 'operational':
      return 'Operational';
    case 'degraded':
      return 'Degraded';
    case 'down':
      return 'Down';
  }
}

export function getOverallStatus(services: ServiceInfo[]): {
  label: string;
  isHealthy: boolean;
} {
  const hasDown = services.some((s) => s.status === 'down');
  const hasDegraded = services.some((s) => s.status === 'degraded');

  if (hasDown || hasDegraded) {
    return { label: 'Some services experiencing issues', isHealthy: false };
  }
  return { label: 'All services operational', isHealthy: true };
}
