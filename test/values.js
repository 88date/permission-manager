'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionManager } = require('../permission-manager.js');

const rules = {
  canUseSetting: { check: (entity) => entity.canUseSetting },
  hasExtendedAccess: { check: (entity) => entity.hasExtendedAccess },
};

const fields = {
  example: {
    caption: 'Example setting',
    ruleGroups: [
      {
        name: 'SETTING_UNAVAILABLE',
        required: true,
        rules: { canUseSetting: true },
      },
    ],
    values: {
      BASIC: { ruleGroups: [] },
      EXTENDED: {
        caption: 'Extended',
        ruleGroups: [
          {
            name: 'EXTENDED_ACCESS_REQUIRED',
            required: true,
            rules: { hasExtendedAccess: true },
          },
        ],
      },
    },
  },
};

const options = {
  name: 'values',
  schema: { canUseSetting: 'boolean', hasExtendedAccess: 'boolean' },
  rules,
  fields,
};

const entity = { canUseSetting: true, hasExtendedAccess: false };
const unexpectedCheck = () => assert.fail('Value rules must not run');

test('Compute field and value permissions with both detailed methods', () => {
  const manager = new PermissionManager(options);
  const expected = {
    allowed: true,
    caption: 'Example setting',
    errors: null,
    values: {
      BASIC: { allowed: true, caption: undefined, errors: null },
      EXTENDED: {
        allowed: false,
        caption: 'Extended',
        errors: ['EXTENDED_ACCESS_REQUIRED'],
      },
    },
  };
  assert.deepEqual(manager.for(entity), { example: expected });
  assert.deepEqual(manager.checkPermission('example', entity), expected);
  assert.equal(
    manager.for({ ...entity, hasExtendedAccess: true }).example.values.EXTENDED
      .allowed,
    true,
  );
});

test('Inherit parent denial without running value rules', () => {
  const manager = new PermissionManager({
    ...options,
    rules: { ...rules, hasExtendedAccess: { check: unexpectedCheck } },
  });
  const result = manager.for({ ...entity, canUseSetting: false }).example;
  assert.equal(result.allowed, false);
  for (const value of Object.values(result.values)) {
    assert.equal(value.allowed, false);
    assert.deepEqual(value.errors, ['SETTING_UNAVAILABLE']);
  }
  assert.equal(result.values.EXTENDED.caption, 'Extended');
  result.values.BASIC.errors.push('LOCAL_ERROR');
  assert.deepEqual(result.errors, ['SETTING_UNAVAILABLE']);
  assert.deepEqual(result.values.EXTENDED.errors, ['SETTING_UNAVAILABLE']);
});

test('Inherit disabled parent denial without running any rules', () => {
  const manager = new PermissionManager({
    ...options,
    fields: { example: { ...fields.example, disabled: true } },
    rules: {
      canUseSetting: { check: unexpectedCheck },
      hasExtendedAccess: { check: unexpectedCheck },
    },
  });
  const result = manager.for(entity).example;
  assert.equal(result.allowed, false);
  assert.deepEqual(result.errors, ['disabled']);
  for (const value of Object.values(result.values)) {
    assert.equal(value.allowed, false);
    assert.deepEqual(value.errors, ['disabled']);
  }
});

test('Deny disabled values without denying the parent', () => {
  const manager = new PermissionManager({
    ...options,
    rules: { ...rules, hasExtendedAccess: { check: unexpectedCheck } },
    fields: {
      example: {
        ...fields.example,
        values: {
          BASIC: {
            caption: 'Basic',
            disabled: true,
            ruleGroups: [{ name: 'check', rules: { hasExtendedAccess: true } }],
          },
        },
      },
    },
  });
  const result = manager.for(entity).example;
  assert.equal(result.allowed, true);
  assert.deepEqual(result.values.BASIC, {
    allowed: false,
    caption: 'Basic',
    errors: ['disabled'],
  });
});

test('Run the same checks for detailed and flat results', () => {
  const calls = [];
  const manager = new PermissionManager({
    ...options,
    rules: {
      canUseSetting: {
        check: (subject) => {
          calls.push('field');
          return subject.canUseSetting;
        },
      },
      hasExtendedAccess: {
        check: (subject) => {
          calls.push('value');
          return subject.hasExtendedAccess;
        },
      },
    },
  });
  const detailed = manager.for(entity);
  assert.deepEqual(calls, ['field', 'value']);
  calls.length = 0;
  assert.deepEqual(manager.flat(entity), { example: detailed.example.allowed });
  assert.deepEqual(calls, ['field', 'value']);
  calls.length = 0;
  assert.deepEqual(manager.flat({ ...entity, canUseSetting: false }), {
    example: false,
  });
  assert.deepEqual(calls, ['field']);
});

test('Propagate value rule errors through detailed and flat methods', () => {
  const error = new Error('Value rule failed');
  const manager = new PermissionManager({
    ...options,
    rules: {
      ...rules,
      hasExtendedAccess: {
        check: () => {
          throw error;
        },
      },
    },
  });
  assert.throws(() => manager.for(entity), error);
  assert.throws(() => manager.flat(entity), error);
});

test('Preserve results for fields without values', () => {
  const manager = new PermissionManager({
    ...options,
    fields: { example: { ...fields.example, values: undefined } },
  });
  assert.deepEqual(manager.for(entity), {
    example: { allowed: true, caption: 'Example setting', errors: null },
  });
  assert.deepEqual(manager.for({ ...entity, canUseSetting: false }), {
    example: {
      allowed: false,
      caption: 'Example setting',
      errors: ['SETTING_UNAVAILABLE'],
    },
  });
  const disabled = new PermissionManager({
    ...options,
    fields: {
      example: { ...fields.example, values: undefined, disabled: true },
    },
  });
  assert.deepEqual(disabled.for(entity), {
    example: { allowed: false, errors: ['disabled'] },
  });
});

test('Return an empty values object when configured', () => {
  const manager = new PermissionManager({
    ...options,
    fields: { example: { ...fields.example, values: {} } },
  });
  assert.deepEqual(manager.for(entity).example.values, {});
});

test('Reject duplicate rule group names within a value', () => {
  assert.throws(
    () =>
      new PermissionManager({
        ...options,
        fields: {
          example: {
            ...fields.example,
            values: {
              BASIC: {
                ruleGroups: [
                  { name: 'default', rules: { canUseSetting: true } },
                  { name: 'default', rules: { hasExtendedAccess: true } },
                ],
              },
            },
          },
        },
      }),
    {
      name: 'Error',
      message:
        'Duplicate rule group "default" in "fields.example.values.BASIC"',
    },
  );
});

test('Allow group names shared by the parent and different values', () => {
  const manager = new PermissionManager({
    ...options,
    fields: {
      example: {
        ...fields.example,
        values: {
          BASIC: {
            ruleGroups: [
              { name: 'SETTING_UNAVAILABLE', rules: { canUseSetting: true } },
            ],
          },
          EXTENDED: {
            ruleGroups: [
              {
                name: 'SETTING_UNAVAILABLE',
                rules: { hasExtendedAccess: true },
              },
            ],
          },
        },
      },
    },
  });
  const result = manager.for(entity).example;
  assert.equal(result.allowed, true);
  assert.equal(result.values.BASIC.allowed, true);
  assert.equal(result.values.EXTENDED.allowed, false);
});

test('Allow a value when one optional group passes', () => {
  const manager = new PermissionManager({
    ...options,
    fields: {
      example: {
        ...fields.example,
        values: {
          EXTENDED: {
            ruleGroups: [
              { name: 'setting', rules: { canUseSetting: true } },
              { name: 'extended', rules: { hasExtendedAccess: true } },
            ],
          },
        },
      },
    },
  });
  assert.equal(manager.for(entity).example.values.EXTENDED.allowed, true);
});

test('Deny a value when a required group fails despite another passing', () => {
  const manager = new PermissionManager({
    ...options,
    fields: {
      example: {
        ...fields.example,
        values: {
          EXTENDED: {
            ruleGroups: [
              { name: 'setting', rules: { canUseSetting: true } },
              {
                name: 'extended',
                required: true,
                rules: { hasExtendedAccess: true },
              },
            ],
          },
        },
      },
    },
  });
  const result = manager.for(entity).example.values.EXTENDED;
  assert.equal(result.allowed, false);
  assert.deepEqual(result.errors, ['extended']);
});

test('Skip a value rule that returns null', () => {
  const manager = new PermissionManager({
    ...options,
    rules: { ...rules, hasExtendedAccess: { check: () => null } },
  });
  const result = manager.for(entity).example.values.EXTENDED;
  assert.equal(result.allowed, true);
  assert.equal(result.errors, null);
});
