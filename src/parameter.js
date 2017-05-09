import { xPathArray, resolver, isNullOrUndefined, toWKT } from './utils';


const typeRE = /{([a-zA-Z:]+)([?]?)}/;

function parseType(value) {
  const match = typeRE.exec(value);
  if (match) {
    return match[1];
  }
  return null;
}

function isMandatory(value) {
  return typeRE.exec(value)[2] !== '?';
}

function eoValueToString(value, isDate = false) {
  const convertDate = (dateValue) => {
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }
    return value;
  };

  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'number') {
    return value.toString();
  } else if (isDate && value instanceof Date) {
    return convertDate(value);
  } else if (Array.isArray(value)) {
    if (isDate) {
      return `{${value.map(convertDate).join(',')}}`;
    }
    return `{${value.join(',')}}`;
  }

  let left = null;
  let right = null;
  if (Object.prototype.hasOwnProperty.call(value, 'min')) {
    left = `[${isDate ? convertDate(value.min) : value.min}`;
  } else if (Object.prototype.hasOwnProperty.call(value, 'minExclusive')) {
    left = `]${isDate ? convertDate(value.minExclusive) : value.minExclusive}`;
  }

  if (Object.prototype.hasOwnProperty.call(value, 'max')) {
    right = `${isDate ? convertDate(value.max) : value.max}]`;
  } else if (Object.prototype.hasOwnProperty.call(value, 'maxExclusive')) {
    right = `${isDate ? convertDate(value.maxExclusive) : value.maxExclusive}[`;
  }

  if (left !== null && right !== null) {
    return `${left},${right}`;
  } else if (left !== null) {
    return left;
  }
  return right;
}

/**
 * Class to describe a single OpenSearch URL parameter.
 */
export class OpenSearchParameter {
  /**
   * Class to describe a single OpenSearch URL parameter.
   * @param {string} type The type of the parameter
   * @param {string} name The name of the parameter
   * @param {boolean} mandatory Whether the parameter is mandatory
   * @param {object[]} [options=null] The possible values for this parameter
   * @param {string} options[].label The label of the option
   * @param {string} options[].value The value of the option
   * @param {Number} [minExclusive=undefined] The minimum value allowed for this
                                              parameter (exclusive)
   * @param {Number} [maxExclusive=undefined] The maximum value allowed for this
                                              parameter (exclusive)
   * @param {Number} [minInclusive=undefined] The minimum value allowed for this
                                              parameter (inclusive)
   * @param {Number} [maxInclusive=undefined] The maximum value allowed for this
                                              parameter (inclusive)
   */
  constructor(type, name, mandatory, options = null,
    minExclusive = undefined, maxExclusive = undefined,
    minInclusive = undefined, maxInclusive = undefined) {
    this._type = type;
    this._name = name;
    this._mandatory = mandatory;
    this._options = options;
    this._minExclusive = minExclusive;
    this._maxExclusive = maxExclusive;
    this._minInclusive = minInclusive;
    this._maxInclusive = maxInclusive;
  }

  /**
   * The type of the parameter
   * @readonly
   */
  get type() {
    return this._type;
  }

  /**
   * The name of the parameter
   * @readonly
   */
  get name() {
    return this._name;
  }

  /**
   * Whether the parameter is mandatory
   * @readonly
   */
  get mandatory() {
    return this._mandatory;
  }

  /**
   * The possible values for this parameter
   * @readonly
   */
  get options() {
    return this._options;
  }

  /**
   * The minimum value allowed for this parameter (exclusive)
   * @readonly
   */
  get minExclusive() {
    return this._minExclusive;
  }

  /**
   * The maximum value allowed for this parameter (exclusive)
   * @readonly
   */
  get maxExclusive() {
    return this._maxExclusive;
  }

  /**
   * The minimum value allowed for this parameter (inclusive)
   * @readonly
   */
  get minInclusive() {
    return this._minInclusive;
  }

  /**
   * The maximum value allowed for this parameter (inclusive)
   * @readonly
   */
  get maxInclusive() {
    return this._maxInclusive;
  }

  /**
   * Combines this parameter with the values of another parameter.
   * @param {OpenSearchParameter} other the other parameter
   * @returns {OpenSearchParameter} the combined parameter
   */
  combined(other) {
    return new OpenSearchParameter(
      this.type, this.name,
      isNullOrUndefined(this.mandatory) ? other.mandatory : this.mandatory,
      isNullOrUndefined(this.options) ? other.options : this.options,
      isNullOrUndefined(this.minExclusive) ? other.minExclusive : this.minExclusive,
      isNullOrUndefined(this.maxExclusive) ? other.maxExclusive : this.maxExclusive,
      isNullOrUndefined(this.minInclusive) ? other.minInclusive : this.minInclusive,
      isNullOrUndefined(this.maxInclusive) ? other.maxInclusive : this.maxInclusive
    );
  }

  /**
   * Serialize the given value according to the internal type to be sent in a
   * request.
   * @param {Number|string|Date|array|object} value The value to serialize. The
   *                                                allowed types depend on the
   *                                                internal type.
   * @returns {string} the serialized value.
   */
  serializeValue(value) {
    switch (this.type) {
      case 'time:start':
      case 'time:end':
        if (value instanceof Date) {
          return value.toISOString();
        }
        break;
      case 'geo:box':
        if (Array.isArray(value)) {
          return value.join(',');
        }
        break;
      case 'geo:geometry':
        return toWKT(value);
      case 'eo:orbitNumber':
      case 'eo:track':
      case 'eo:frame':
      case 'eo:cloudCover':
      case 'eo:snowCover':
      case 'eo:startTimeFromAscendingNode':
      case 'eo:completionTimeFromAscendingNode':
      case 'eo:illuminationAzimuthAngle':
      case 'eo:illuminationZenithAngle':
      case 'eo:illuminationElevationAngle':
      case 'eo:minimumIncidenceAngle':
      case 'eo:maximumIncidenceAngle':
      case 'eo:dopplerFrequency':
      case 'eo:incidenceAngleVariation':
        return eoValueToString(value);
      case 'eo:availabilityTime':
      case 'eo:creationDate':
      case 'eo:modificationDate':
      case 'eo:processingDate':
        return eoValueToString(value, true);
      default:
        break;
    }
    return value;
  }

  /**
   * Constructs a new OpenSearchParameter from a DOM-Node.
   * @param {DOMNode} node the node to create the parameter from.
   * @returns {OpenSearchParameter} the constructed parameters object.
   */
  static fromNode(node) {
    const type = parseType(node.getAttribute('value'));
    const name = node.getAttribute('name');
    const mandatory = node.hasAttribute('minimum')
                        ? node.getAttribute('minimum') !== '0' : undefined;
    const minExclusive = node.hasAttribute('minExclusive')
                          ? parseInt(node.getAttribute('minExclusive'), 10)
                          : undefined;
    const maxExclusive = node.hasAttribute('maxExclusive')
                          ? parseInt(node.getAttribute('maxExclusive'), 10)
                          : undefined;
    const minInclusive = node.hasAttribute('minInclusive')
                          ? parseInt(node.getAttribute('minInclusive'), 10)
                          : undefined;
    const maxInclusive = node.hasAttribute('maxInclusive')
                          ? parseInt(node.getAttribute('maxInclusive'), 10)
                          : undefined;
    const optionNodes = xPathArray(node, 'parameters:Option', resolver);
    let options;
    if (optionNodes.length) {
      options = optionNodes.map(optionNode => ({
        label: optionNode.getAttribute('label'),
        value: optionNode.getAttribute('value'),
      }));
    }
    return new OpenSearchParameter(
      type, name, mandatory, options, minExclusive, maxExclusive, minInclusive, maxInclusive
    );
  }

  /**
   * Constructs a new OpenSearchParameter from a key value pair (e.g: from the
   * query part of a KVP-URL). Returns null, when the value could not be parsed.
   * @param {DOMNode} key the key of the key-value-pair.
   * @param {DOMNode} value the value of the key-value-pair.
   * @returns {OpenSearchParameter|null} the constructed parameters object.
   */
  static fromKeyValuePair(key, value) {
    const type = parseType(value);
    if (type) {
      return new OpenSearchParameter(
        type, key, isMandatory(value)
      );
    }
    return null;
  }

  /**
   * Serialize the parameter to a simple object.
   * @returns {object} The serialized parameter
   */
  serialize() {
    const values = {
      type: this._type,
      name: this._name,
      mandatory: this._mandatory,
      options: this._options,
    };

    if (typeof this._minExclusive !== 'undefined') {
      values.minExclusive = this._minExclusive;
    }
    if (typeof this._maxExclusive !== 'undefined') {
      values.maxExclusive = this._maxExclusive;
    }
    if (typeof this._minInclusive !== 'undefined') {
      values.minInclusive = this._minInclusive;
    }
    if (typeof this._maxInclusive !== 'undefined') {
      values.maxInclusive = this._maxInclusive;
    }
    return values;
  }

  /**
   * Deserialize a parameter from a simple object.
   * @param {object} values The serialized parameter
   * @returns {OpenSearchParameter} The deserialized parameter
   */
  static deserialize(values) {
    return new OpenSearchParameter(
      values.type, values.name, values.mandatory, values.options,
      values.minExclusive, values.maxExclusive, values.minInclusive, values.maxInclusive
    );
  }
}
