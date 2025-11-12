/**
 * Organization System Types
 *
 * Type definitions for multi-organization support including
 * organizations, teams, memberships, and AI configuration.
 */

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum TeamRole {
  MEMBER = 'member',
  LEAD = 'lead',
  ADMIN = 'admin'
}

export enum OrganizationSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise'
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  size?: OrganizationSize;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  title?: string;
  department?: string;
  joined_at: Date;
  last_accessed_at: Date;
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  member_count?: number;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: Date;
}

export interface OrganizationAIConfig {
  id: string;
  organization_id: string;
  welcome_messages: string[];
  welcome_title?: string;
  welcome_description?: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

export interface OrganizationSpace {
  id: string;
  organization_id: string;
  space_id: string;
  profile_id: string;
  created_at: Date;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  active_organization_id?: string;
  org_space_preferences: Record<string, string>; // org_id -> space_id
  created_at: Date;
  updated_at: Date;
}

/**
 * Organization context with full details
 */
export interface OrganizationContext {
  membership: OrganizationMembership & { organization: Organization };
  ai_config: OrganizationAIConfig | null;
  spaces: OrganizationSpace[];
  teams: (Team & { user_role?: TeamRole })[];
  is_active: boolean;
}

/**
 * User's complete organization context
 */
export interface UserOrganizationContext {
  organizations: OrganizationContext[];
  active_organization_id: string | null;
  active_organization: OrganizationContext | null;
}

/**
 * Organization member with user details
 */
export interface OrganizationMemberDetail {
  user_id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  title?: string;
  department?: string;
  joined_at: Date;
}
