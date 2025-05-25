'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { PermissionManager } = require('../permission-manager.js');

const rules = {
  canAccess: {
    caption: 'Есть доступ',
    parameters: {
      userIds: 'array',
    },
    check: (entity, parameters) => {
      const { profile } = entity;
      const { userIds } = parameters;
      const isValid = userIds.includes(profile.id);
      return isValid ? true : null;
    },
  },
  noLevel: {
    caption: 'Нет уровня',
    parameters: null,
    check: (entity) => entity.profile.level === null,
  },
  hasLevel: {
    caption: 'Есть уровень',
    parameters: null,
    check: (entity) => Boolean(entity.profile.level),
  },
  hasfirstName: {
    caption: 'Есть имя',
    parameters: null,
    check: (entity) => Boolean(entity.profile.firstName),
  },
  hasGender: {
    caption: 'Есть пол',
    parameters: null,
    check: (entity) => Boolean(entity.profile.gender),
  },
};

const fields = {
  shareLocaton: {
    caption: 'Поделиться локацией',
    disabled: false,
    ruleGroups: [
      {
        name: 'default',
        rules: {
          noLevel: true,
          hasLevel: true,
        },
      },
    ],
  },
  example1: {
    caption: 'Пример 1',
    disabled: false,
    ruleGroups: [
      {
        name: 'checkAccess',
        rules: {
          canAccess: {
            userIds: ['33333', '44444'],
          },
        },
      },
      {
        name: 'checkLevel',
        rules: {
          hasGender: true,
          hasfirstName: true,
        },
      },
    ],
  },
  example2: {
    caption: 'Пример 2',
    disabled: false,
    ruleGroups: [
      {
        name: 'default',
        rules: {
          noLevel: true,
        },
      },
    ],
  },
};

const schema = {
  profile: {
    id: 'string',
    phoneNumber: { type: 'string', required: false },
    gender: { enum: ['MALE', 'FEMALE'], required: false },
    role: { type: 'string', required: false },
    level: { type: 'string', required: false },
    birthday: { type: 'string', required: false },
    age: { type: 'number', required: false },
    email: { type: 'string', required: false },
    firstName: { type: 'string', required: false },
    username: { type: 'string', required: false },
    selfieVerificationStatus: { enum: ['NOT_UPLOADED', 'PENDING', 'VERIFIED'] },
    createdAt: 'string',
  },
};

test('Check instance', async () => {
  const permissionManager = new PermissionManager({
    name: 'test',
    rules,
    fields,
    schema,
  });
  assert.deepStrictEqual(permissionManager instanceof PermissionManager, true);
});
