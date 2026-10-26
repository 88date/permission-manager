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

    this.#validateFields(fields);
  }

  #validateFields(fields, path = 'fields') {
    for (const fieldName of Object.keys(fields)) {
      const { ruleGroups, values } = fields[fieldName];
      const fieldPath = `${path}.${fieldName}`;
      const groupNames = new Set();
      for (const { name: groupName } of ruleGroups) {
        if (groupNames.has(groupName)) {
          throw new Error(
            `Duplicate rule group "${groupName}" in "${fieldPath}"`,
          );
        }
        groupNames.add(groupName);
      }
      if (values) this.#validateFields(values, `${fieldPath}.values`);
    }
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

  #checkField(field, entity) {
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

  checkPermission(fieldName, entity) {
    const field = this.fields[fieldName];
    const permission = this.#checkField(field, entity);
    if (!field.values) return permission;

    const values = {};
    for (const [valueName, value] of Object.entries(field.values)) {
      if (!permission.allowed) {
        values[valueName] = {
          allowed: false,
          caption: value.caption,
          errors: [...permission.errors],
        };
        continue;
      }
      const result = this.#checkField(value, entity);
      values[valueName] = { ...result, caption: value.caption };
    }
    return { ...permission, values };
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
