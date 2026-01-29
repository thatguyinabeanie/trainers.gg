/**
 * AT Protocol Data Serialization
 *
 * The @atproto/api library returns objects containing CID instances which have
 * toJSON() methods. React Server Components cannot serialize objects with
 * toJSON across the RSC boundary to Client Components.
 *
 * This utility strips non-plain objects by round-tripping through JSON,
 * which invokes toJSON() and produces plain serializable values.
 */

/**
 * Convert AT Protocol API response data to plain serializable objects.
 * Use this before returning data from Server Actions to Client Components.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
