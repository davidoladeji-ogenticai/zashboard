// Analytics types for Zashboard.ai
export interface UserMetrics {
  daily_active_users: number;
  monthly_active_users: number;
  new_users_today: number;
  returning_users: number;
  user_retention_rate: number;
  average_session_duration: number;
}

export interface GeographicMetrics {
  users_by_country: Record<string, number>;
  users_by_region: Record<string, number>;
  top_countries: Array<{
    country: string;
    users: number;
    percentage: number;
  }>;
}

export interface VersionMetrics {
  current_version: string;
  version_adoption: Record<string, {
    users: number;
    percentage: number;
  }>;
  update_success_rate: number;
  pending_updates: number;
  failed_updates: number;
}

export interface FeatureMetrics {
  tabs_opened_per_session: number;
  bookmarks_created: number;
  extensions_used: Record<string, number>;
  ai_assistant_usage: number;
  search_queries: number;
  downloads_initiated: number;
}

export interface PerformanceMetrics {
  average_startup_time: number;
  average_memory_usage: number;
  crash_rate: number;
  error_count: number;
  response_times: {
    navigation: number;
    search: number;
    tab_switching: number;
  };
}

export interface RealtimeMetrics {
  active_users_now: number;
  users_last_hour: number;
  active_sessions: number;
  current_version_users: number;
  pending_updates: number;
  last_updated: string;
}

export interface HistoricalData {
  period: string;
  metric: string;
  data_points: Array<{
    date: string;
    value: number;
    metadata?: Record<string, any>;
  }>;
  summary: {
    total: number;
    average: number;
    growth_rate: number;
  };
}

export interface EventPayload {
  event: string;
  properties: {
    user_id: string;
    app_version: string;
    platform: string;
    timestamp: number;
    [key: string]: any;
  };
}

export interface BatchEventPayload {
  events: EventPayload[];
  client_info: {
    user_id: string;
    app_version: string;
    platform: string;
    batch_timestamp: number;
  };
}