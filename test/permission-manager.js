'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { PermissionManager } = require('../permission-manager.js');

test('Check instance', async () => {
  const permissionManager = new PermissionManager();
  assert.deepStrictEqual(permissionManager instanceof PermissionManager, true);
});
