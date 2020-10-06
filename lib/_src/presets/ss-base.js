"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _net = _interopRequireDefault(require("net"));

var _ip = _interopRequireDefault(require("ip"));

var _utils = require("../utils");

var _defs = require("./defs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const ATYP_V4 = 0x01;
const ATYP_V6 = 0x04;
const ATYP_DOMAIN = 0x03;

function getHostType(host) {
  if (_net.default.isIPv4(host)) {
    return ATYP_V4;
  }

  if (_net.default.isIPv6(host)) {
    return ATYP_V6;
  }

  return ATYP_DOMAIN;
}
/**
 * @description
 *   Deliver destination address.
 *
 * @examples
 *   {"name": "ss-base"}
 *
 * @protocol
 *
 *   # TCP stream (client -> server)
 *   +------+----------+----------+----------+---------+
 *   | ATYP | DST.ADDR | DST.PORT |   DATA   |   ...   |
 *   +------+----------+----------+----------+---------+
 *   |  1   | Variable |    2     | Variable |   ...   |
 *   +------+----------+----------+----------+---------+
 *
 *   # TCP chunks
 *   +----------+
 *   |   DATA   |
 *   +----------+
 *   | Variable |
 *   +----------+
 *
 *   # UDP packet (client <-> server)
 *   +------+----------+----------+----------+
 *   | ATYP | DST.ADDR | DST.PORT |   DATA   |
 *   +------+----------+----------+----------+
 *   |  1   | Variable |    2     | Variable |
 *   +------+----------+----------+----------+
 *
 * @explain
 *   1. ATYP is one of [0x01(ipv4), 0x03(hostname), 0x04(ipv6)].
 *   2. If ATYP is 0x03, DST.ADDR[0] is len(DST.ADDR).
 *   3. If ATYP is 0x04, DST.ADDR must be a 16 bytes ipv6 address.
 *
 * @reference
 *    https://shadowsocks.org/en/spec/Protocol.html
 */


class SsBasePreset extends _defs.IPresetAddressing {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_isConnecting", false);

    _defineProperty(this, "_pending", Buffer.alloc(0));

    _defineProperty(this, "_isHeaderSent", false);

    _defineProperty(this, "_isHeaderRecv", false);

    _defineProperty(this, "_atyp", ATYP_V4);

    _defineProperty(this, "_host", null);

    _defineProperty(this, "_port", null);

    _defineProperty(this, "_headSize", 0);
  }

  get headSize() {
    return this._headSize;
  }

  onInitTargetAddress({
    host,
    port
  }) {
    const type = getHostType(host);
    this._atyp = type;
    this._port = (0, _utils.numberToBuffer)(port);
    this._host = type === ATYP_DOMAIN ? Buffer.from(host) : _ip.default.toBuffer(host);
  }

  onDestroy() {
    this._pending = null;
    this._host = null;
    this._port = null;
  }

  encodeHeader() {
    const head = Buffer.from([this._atyp, ...(this._atyp === ATYP_DOMAIN ? [this._host.length] : []), ...this._host, ...this._port]);
    this._headSize = head.length;
    return head;
  }

  decodeHeader({
    buffer,
    fail
  }) {
    if (buffer.length < 7) {
      return fail(`invalid length: ${buffer.length}`);
    }

    const atyp = buffer[0];
    let addr; // string

    let port; // number

    let offset = 3;

    switch (atyp) {
      case ATYP_V4:
        addr = _ip.default.toString(buffer.slice(1, 5));
        port = buffer.slice(5, 7).readUInt16BE(0);
        offset += 4;
        break;

      case ATYP_V6:
        if (buffer.length < 19) {
          return fail(`invalid length: ${buffer.length}`);
        }

        addr = _ip.default.toString(buffer.slice(1, 17));
        port = buffer.slice(17, 19).readUInt16BE(0);
        offset += 16;
        break;

      case ATYP_DOMAIN:
        {
          const domainLen = buffer[1];

          if (buffer.length < domainLen + 4) {
            return fail(`invalid length: ${buffer.length}`);
          }

          addr = buffer.slice(2, 2 + domainLen).toString();

          if (!(0, _utils.isValidHostname)(addr)) {
            return fail(`addr=${addr} is an invalid hostname`);
          }

          port = buffer.slice(2 + domainLen, 4 + domainLen).readUInt16BE(0);
          offset += domainLen + 1;
          break;
        }

      default:
        return fail(`invalid atyp: ${atyp}`);
    }

    const data = buffer.slice(offset);
    return {
      host: addr,
      port,
      data
    };
  } // tcp


  clientOut({
    buffer
  }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this.encodeHeader(), buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({
    buffer,
    next,
    fail
  }) {
    if (!this._isHeaderRecv) {
      // shadowsocks(python) aead cipher put [atyp][dst.addr][dst.port] into the first chunk
      // we must wait onConnected() before next().
      if (this._isConnecting) {
        this._pending = Buffer.concat([this._pending, buffer]);
        return;
      }

      const decoded = this.decodeHeader({
        buffer,
        fail
      });

      if (!decoded) {
        return;
      }

      const {
        host,
        port,
        data
      } = decoded; // notify to connect to the real server

      this._isConnecting = true;
      this.resolveTargetAddress({
        host,
        port
      }, () => {
        if (this._pending !== null) {
          next(Buffer.concat([data, this._pending]));
        }

        this._isHeaderRecv = true;
        this._isConnecting = false;
        this._pending = null;
      });
    } else {
      return buffer;
    }
  } // udp


  beforeOutUdp({
    buffer
  }) {
    return Buffer.concat([this.encodeHeader(), buffer]);
  }

  serverInUdp({
    buffer,
    next,
    fail
  }) {
    const decoded = this.decodeHeader({
      buffer,
      fail
    });

    if (!decoded) {
      return;
    }

    const {
      host,
      port,
      data
    } = decoded;
    this._atyp = getHostType(host);
    this._host = this._atyp === ATYP_DOMAIN ? Buffer.from(host) : _ip.default.toBuffer(host);
    this._port = (0, _utils.numberToBuffer)(port);
    this.resolveTargetAddress({
      host,
      port
    }, () => next(data));
  }

}

exports.default = SsBasePreset;