"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IPresetAddressing = exports.IPreset = void 0;

var _events = _interopRequireDefault(require("events"));

var _constants = require("../constants");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @lifecycle
 *   static onCheckParams()
 *   static onCache()
 *   constructor()
 *   onInit()
 *   ...
 *   onDestroy()
 *
 * @note
 *   static onCheckParams() and static onCache() are called only once since new Hub().
 */
class IPreset extends _events.default {
  _write({
    type,
    buffer,
    direct,
    isUdp
  }, extraArgs) {
    const postfix = (type === _constants.PIPE_ENCODE ? 'Out' : 'In') + (isUdp ? 'Udp' : ''); // prepare args

    const fail = message => void this.emit('fail', this.name, message);

    const next = (processed, isReverse = false) => {
      // oh my nice hack to deal with reverse pipeline if haven't been created
      const hasListener = this.emit(`next_${isReverse ? -type : type}`, processed);

      if (!hasListener) {
        direct(processed, isReverse);
      }
    }; // clientXXX, serverXXX


    const nextLifeCycleHook = (buf
    /*, isReverse = false */
    ) => {
      const args = {
        buffer: buf,
        next,
        fail
      };
      const ret = this._config.is_client ? this[`client${postfix}`](args, extraArgs) : this[`server${postfix}`](args, extraArgs);

      if (ret instanceof Buffer) {
        next(ret);
      }
    }; // beforeXXX
    // NOTE: next(buf, isReverse) is not available in beforeXXX


    const args = {
      buffer,
      next: nextLifeCycleHook,
      fail
    };
    const ret = this[`before${postfix}`](args, extraArgs);

    if (ret instanceof Buffer) {
      nextLifeCycleHook(ret);
    }
  }

  get name() {
    return (0, _utils.kebabCase)(this.constructor.name).replace(/(.*)-preset/i, '$1');
  }
  /**
   * check params passed to the preset, if any errors, should throw directly
   * @param params
   */


  static onCheckParams(params) {}
  /**
   * you can make some cache in store or just return something
   * you want to put in store, then access store later in other
   * hook functions via this.getStore()
   * @param params
   * @param store
   */


  static async onCache(params, store) {// or return something
  }
  /**
   * constructor
   * @param config
   * @param params
   */


  constructor({
    config,
    params
  } = {}) {
    super();

    _defineProperty(this, "_config", null);

    this._config = config;
  }
  /**
   * constructor alternative to do initialization
   * @param params
   */


  onInit(params) {}
  /**
   * you can do something when preset destroyed
   */


  onDestroy() {} // hooks for tcp


  beforeOut({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  beforeIn({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  clientOut({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  serverIn({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  serverOut({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  clientIn({
    buffer,
    next,
    fail
  }) {
    return buffer;
  } // hooks for udp


  beforeOutUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  beforeInUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  clientOutUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  serverInUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  serverOutUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  clientInUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  } // reserved methods, DO NOT overwrite them!

  /**
   * direct read any property(match non-static then static) of other preset
   * @param presetName
   * @param propertyName
   */


  readProperty(presetName, propertyName) {}
  /**
   * return store passed to onCache()
   */


  getStore() {}

}
/**
 * a class which handle addressing
 */


exports.IPreset = IPreset;

class IPresetAddressing extends IPreset {
  /**
   * triggered once target address resolved on client side
   * @param host
   * @param port
   */
  onInitTargetAddress({
    host,
    port
  }) {} // reserved methods, DO NOT overwrite them!

  /**
   * call it when target address was resolved on server side
   * @param host
   * @param port
   * @param callback
   */


  resolveTargetAddress({
    host,
    port
  }, callback) {}

}

exports.IPresetAddressing = IPresetAddressing;