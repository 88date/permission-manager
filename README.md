# Permission Manager

Evaluate synchronous rules for fields and their available values.

```js
const { PermissionManager } = require('permission-manager');

const manager = new PermissionManager({
  name: 'settings',
  schema: {
    canUseSetting: 'boolean',
    hasExtendedAccess: 'boolean',
  },
  rules: {
    canUseSetting: { check: (entity) => entity.canUseSetting },
    hasExtendedAccess: { check: (entity) => entity.hasExtendedAccess },
  },
  fields: {
    example: {
      caption: 'Example setting',
      disabled: false,
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
  },
});

const entity = { canUseSetting: true, hasExtendedAccess: false };
const permissions = manager.for(entity);
```

The JSON representation of `permissions` is:

```json
{
  "example": {
    "allowed": true,
    "caption": "Example setting",
    "errors": null,
    "values": {
      "BASIC": {
        "allowed": true,
        "errors": null
      },
      "EXTENDED": {
        "allowed": false,
        "errors": ["EXTENDED_ACCESS_REQUIRED"]
      }
    }
  }
}
```

## Values

Each value supports `caption`, `disabled`, and `ruleGroups`. Values have one level
of nesting; their checks reference the same `rules` registry as their parent.

- A value is allowed only when both its parent field and its own checks allow it.
- When the parent is denied, all values inherit its errors, including `disabled`.
  Their own rules are not evaluated. Value captions are preserved.
- Denying a value does not deny its parent or other values.
- Fields without `values` retain their existing result format. An explicit empty
  `values: {}` produces an empty values object.
- Group names must be unique within each field or individual value. Names can be
  shared across fields, across values, and between a field and its values.

## Methods

- `for(entity)` validates the entity and returns all fields with their values.
- `checkPermission(fieldName, entity)` returns one field with its values. As
  before, this method does not validate the entity against the schema.
- `flat(entity)` runs the same checks as `for(entity)` and returns only each
  field's `allowed` boolean. Value checks are evaluated too, but their results are
  omitted: `manager.flat(entity)` above returns `{ example: true }`.

## Rule groups

A `false` result fails its group. A `null` result skips that rule without failing
the group. A group with no failed rules passes, including an empty group or one
whose rules all return `null`. A field or value is allowed when at least one
group passes and no required group fails. An empty `ruleGroups` array allows
access unless `disabled` is set. Checks must be synchronous and return
`boolean | null`.
