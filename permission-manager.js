'use strict';

const { Schema } = require('metaschema');

const ERROR_DISABLED_PERMISSION = 'disabled';

class PermissionManager {
  name = null;
  rules = {};
  fields = {};
  #schema = null;
  #fieldsList = [];

  constructor({ name, rules, fields, schema }) {
    this.name = name;
    this.rules = rules;
    this.fields = fields;
    this.#schema = Schema.from(schema);
    this.#fieldsList = Object.keys(fields);
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

  #compute(entity, flat = false) {
    const permissions = {};
    for (const field of this.#fieldsList) {
      const permission = this.checkPermission(field, entity);
      permissions[field] = flat ? permission.allowed : permission;
    }
    return permissions;
  }

  checkPermission(fieldName, entity) {
    const field = this.fields[fieldName];
    const { ruleGroups, disabled, caption } = field;
    const fails = new Set();
    let success = true;
    if (disabled) {
      return { allowed: false, errors: [ERROR_DISABLED_PERMISSION] };
    }
    for (const { name: group, rules, required } of ruleGroups) {
      for (const [ruleName, parameters] of Object.entries(rules)) {
        const valid = this.#checkRule(ruleName, entity, parameters);
        if (valid === null) continue;
        if (!valid) {
          if (required) success = false;
          fails.add(group);
        }
      }
    }
    const allowed =
      (success && fails.size < ruleGroups.length) || ruleGroups.length === 0;
    const errors = allowed ? null : Array.from(fails);
    return { allowed, caption, errors };
  }

  for(entity) {
    this.#checkSchema(entity);
    return this.#compute(entity);
  }

  flat(entity) {
    this.#checkSchema(entity);
    return this.#compute(entity, true);
  }
}

module.exports = { PermissionManager };
