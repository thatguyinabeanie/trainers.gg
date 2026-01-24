import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "./client";
import {
  listPublicOrganizations,
  getOrganizationBySlug,
} from "@trainers/supabase/queries";

export type OrganizationWithCounts = Awaited<
  ReturnType<typeof listPublicOrganizations>
>[number];

export type OrganizationDetail = NonNullable<
  Awaited<ReturnType<typeof getOrganizationBySlug>>
>;

/**
 * Hook to fetch all public organizations
 */
export function useOrganizations() {
  const [organizations, setOrganizations] = useState<OrganizationWithCounts[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const data = await listPublicOrganizations(supabase);
      setOrganizations(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch organizations")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    organizations,
    loading,
    error,
    refetch: fetchOrganizations,
  };
}

/**
 * Hook to fetch a single organization by slug
 */
export function useOrganization(slug: string | undefined) {
  const [organization, setOrganization] = useState<OrganizationDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const data = await getOrganizationBySlug(supabase, slug);
      setOrganization(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch organization")
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    organization,
    loading,
    error,
    refetch: fetchOrganization,
  };
}
