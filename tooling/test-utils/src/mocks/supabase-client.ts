/**
 * Unified Supabase mock client for tests.
 *
 * Superset of all query builder methods used across the codebase.
 * Each method returns `this` (via mockReturnThis) to support fluent chaining,
 * except terminal methods (single, maybeSingle) which return resolved values.
 */

export type MockSupabaseClient = {
  from: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  or: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  ilike: jest.Mock;
  not: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  rpc: jest.Mock;
  auth: {
    getUser: jest.Mock;
  };
};

export function createMockClient(): MockSupabaseClient {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  };
}
