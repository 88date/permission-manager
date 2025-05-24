'use strict';

const { Schema } = require('metaschema');

const ERROR_DISABLED_PERMISSION = 'disabled';

class PermissionManager {
  name = null;
  rules = {};
  permissions = {};
  #schema = null;
  #permissionList = [];

  constructor({ name, rules, permissions, schema }) {
    this.name = name;
    this.rules = rules;
    this.permissions = permissions;
    this.#schema = Schema.from(schema);
    this.#permissionList = Object.keys(permissions);
  }

  #checkSchema(entity) {
    const { valid, errors } = this.#schema.check(entity);
    if (!valid) {
      const problems = errors.join('; ');
      throw new Error('Invalid parameters type: ' + problems);
    }
    return true;
  }

  #checkRule(ruleName, entity, parameters) {
    const rule = this.rules[ruleName];
    return rule.check(entity, parameters);
  }

  #compute(entity) {
    const permissions = {};
    for (const name of this.#permissionList) {
      permissions[name] = this.checkPermission(name, entity);
    }
    return permissions;
  }

  checkPermission(name, entity) {
    const permission = this.permissions[name];
    const { ruleGroups, disabled } = permission;

    if (disabled) {
      return { allowed: false, errors: [ERROR_DISABLED_PERMISSION] };
    }

    const errors = [];

    for (const { name: group, rules } of ruleGroups) {
      for (const [ruleName, parameters] of Object.entries(rules)) {
        const valid = this.#checkRule(ruleName, entity, parameters);
        if (valid === null) continue;
        if (!valid) errors.push(group);
      }
    }
    const allowed = errors.length < ruleGroups.length;
    return { allowed, errors: allowed ? null : errors };
  }

  getPermissions(entity) {
    this.#checkSchema(entity);
    return this.#compute(entity);
  }

  getPermissionsFlat(entity) {
    const permissions = this.getPermissions(entity);
    const flat = {};
    for (const name of this.#permissionList) {
      flat[name] = permissions[name].allowed;
    }
    return flat;
  }
}

module.exports = { PermissionManager };
