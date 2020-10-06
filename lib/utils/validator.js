"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isValidHostname = isValidHostname;
exports.isValidPort = isValidPort;
/**
 * verify hostname
 *
 * @param hostname
 * @returns {boolean}
 *
 * @reference
 *   http://stackoverflow.com/questions/1755144/how-to-validate-domain-name-in-php
 */

function isValidHostname(hostname) {
  if (typeof hostname !== 'string') {
    return false;
  } // overall length check


  if (hostname.length < 1 || hostname.length > 253) {
    return false;
  } // valid chars check


  if (/^([a-z\d](-*[a-z\d])*)(\.([a-z\d](-*[a-z\d])*))*$/i.test(hostname) === false) {
    return false;
  } // length of each label


  if (/^[^.]{1,63}(\.[^.]{1,63})*$/.test(hostname) === false) {
    return false;
  }

  return true;
}
/**
 * whether a port is valid or not
 * @param port
 * @returns {boolean}
 */


function isValidPort(port) {
  if (!Number.isInteger(port)) {
    return false;
  }

  return !(port <= 0 || port >= 65535);
}