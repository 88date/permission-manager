export class PermissionManager {
  name: string;
  rules: any;
  permissions: any;
  checkPermission(permissionName: string, entity: any): void;
  getPermissions(entity: any): void;
  getPermissionsFlat(entity: any): void;
}
