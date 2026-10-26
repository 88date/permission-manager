export interface PermissionRule<Entity = unknown, RuleParameters = unknown> {
  caption?: string;
  parameters?: unknown;
  check: (entity: Entity, parameters: RuleParameters) => boolean | null;
}

export interface PermissionRuleGroup {
  name: string;
  rules: Record<string, unknown>;
  required?: boolean;
}

export interface PermissionValue {
  caption?: string;
  disabled?: boolean;
  ruleGroups: PermissionRuleGroup[];
}

export interface PermissionField extends PermissionValue {
  values?: Record<string, PermissionValue>;
}

export interface PermissionValueResult {
  allowed: boolean;
  caption?: string;
  errors: string[] | null;
}

export interface PermissionResult extends PermissionValueResult {
  values?: Record<string, PermissionValueResult>;
}

export interface PermissionManagerOptions<Entity = unknown> {
  name: string;
  rules: Record<string, PermissionRule<Entity, any>>;
  fields: Record<string, PermissionField>;
  schema: object;
}

export class PermissionManager<Entity = unknown> {
  constructor(options: PermissionManagerOptions<Entity>);

  name: string;
  rules: Record<string, PermissionRule<Entity, any>>;
  fields: Record<string, PermissionField>;

  checkPermission(fieldName: string, entity: Entity): PermissionResult;
  for(entity: Entity): Record<string, PermissionResult>;
  flat(entity: Entity): Record<string, boolean>;
}
