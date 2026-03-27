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
