"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCurrentTimestampInt = getCurrentTimestampInt;

/**
 * get current utc timestamp
 * @returns {number}
 */
function getCurrentTimestampInt() {
  return Math.floor(Date.now() / 1e3);
}