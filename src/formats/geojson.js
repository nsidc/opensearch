import { assign } from '../utils';
/**
 * Class to parse GeoJSON results
 * @constructor GeoJSONFormat
 */
export class GeoJSONFormat {
  /**
   * Parse the given JSON.
   * @param {string} text The JSON string to parse.
   * @returns {SearchResult} The parsed search result
   */
  parse(text) {
    const result = JSON.parse(text);
    const records = result.features.map((item) => {
      if (!Object.prototype.hasOwnProperty.call(item, 'id') && Object.prototype.hasOwnProperty.call(item.properties, 'id')) {
        return assign({
          id: item.properties.id,
        }, item);
      }
      return item;
    });

    return {
      // TODO: parse properties of featurecollection
      records,
    };
  }
}
