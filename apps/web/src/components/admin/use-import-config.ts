"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getSiteConfig, setSiteConfig } from "@/actions/site-config";

/**
 * Owns the import console's per-source site-config: auto-import backend toggles
 * (pg_cron), throughput/cron/batch inputs, their committed (last-saved) values,
 * and the load + save handlers. Self-contained — depends only on the
 * getSiteConfig/setSiteConfig actions. Returns the values + handlers the
 * ExternalDataSettings panel consumes.
 */
export function useImportConfig() {
  // Auto-import state (backend = pg_cron)
  const [rk9BackendAutoImport, setRk9BackendAutoImport] = useState(false);
  const [limitlessBackendAutoImport, setLimitlessBackendAutoImport] =
    useState(false);

  // Throughput config
  const [rk9TeamsPerTick, setRk9TeamsPerTick] = useState(100);
  const [rk9TeamConcurrency, setRk9TeamConcurrency] = useState(3);
  const [rk9CronInterval, setRk9CronInterval] = useState(60);
  const [limitlessCronInterval, setLimitlessCronInterval] = useState(300);
  const [limitlessBatchSize, setLimitlessBatchSize] = useState(20);

  // Committed (last successfully saved) values for config inputs
  const rk9TeamsPerTickCommitted = useRef(rk9TeamsPerTick);
  const rk9TeamConcurrencyCommitted = useRef(rk9TeamConcurrency);
  const rk9CronIntervalCommitted = useRef(rk9CronInterval);
  const limitlessCronIntervalCommitted = useRef(limitlessCronInterval);
  const limitlessBatchSizeCommitted = useRef(limitlessBatchSize);

  // Single loading flag for all site config fields — set false once all 7 resolve
  const [configLoading, setConfigLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Load auto-import settings from DB (per-source)
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      try {
        const [
          rk9Auto,
          limAuto,
          teamsPerTick,
          batchSize,
          concurrency,
          rk9Cron,
          limCron,
        ] = await Promise.all([
          getSiteConfig<boolean>("rk9_backend_auto_import"),
          getSiteConfig<boolean>("limitless_backend_auto_import"),
          getSiteConfig<number>("rk9_max_teams_per_tick"),
          getSiteConfig<number>("limitless_batch_size"),
          getSiteConfig<number>("rk9_team_concurrency"),
          getSiteConfig<number>("rk9_cron_interval_seconds"),
          getSiteConfig<number>("limitless_cron_interval_seconds"),
        ]);
        if (cancelled) return;
        if (rk9Auto.success && rk9Auto.data !== null)
          setRk9BackendAutoImport(rk9Auto.data);
        if (limAuto.success && limAuto.data !== null)
          setLimitlessBackendAutoImport(limAuto.data);
        if (teamsPerTick.success && teamsPerTick.data !== null)
          setRk9TeamsPerTick(teamsPerTick.data);
        if (batchSize.success && batchSize.data !== null)
          setLimitlessBatchSize(batchSize.data);
        if (concurrency.success && concurrency.data !== null)
          setRk9TeamConcurrency(concurrency.data);
        if (rk9Cron.success && rk9Cron.data !== null)
          setRk9CronInterval(rk9Cron.data);
        if (limCron.success && limCron.data !== null)
          setLimitlessCronInterval(limCron.data);
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    }
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleRk9Backend(checked: boolean) {
    const previous = rk9BackendAutoImport;
    setRk9BackendAutoImport(checked);
    const result = await setSiteConfig("rk9_backend_auto_import", checked);
    if (!result.success) {
      setRk9BackendAutoImport(previous);
      toast.error("Failed to update RK9 backend setting");
      return;
    }
    // Only reset timer when the save succeeded and we're enabling
    if (checked) {
      await setSiteConfig("rk9_last_run_at", null);
    }
  }

  async function handleToggleLimitlessBackend(checked: boolean) {
    const previous = limitlessBackendAutoImport;
    setLimitlessBackendAutoImport(checked);
    const result = await setSiteConfig(
      "limitless_backend_auto_import",
      checked
    );
    if (!result.success) {
      setLimitlessBackendAutoImport(previous);
      toast.error("Failed to update Limitless backend setting");
      return;
    }
    // Only reset timer when the save succeeded and we're enabling
    if (checked) {
      await setSiteConfig("limitless_last_run_at", null);
    }
  }

  function handleRk9TeamsPerTickChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setRk9TeamsPerTick(num);
  }

  async function saveRk9TeamsPerTick() {
    const current = rk9TeamsPerTick;
    const previous = rk9TeamsPerTickCommitted.current;
    const result = await setSiteConfig("rk9_max_teams_per_tick", current);
    if (!result.success) {
      setRk9TeamsPerTick(previous);
      toast.error("Failed to save setting");
    } else {
      rk9TeamsPerTickCommitted.current = current;
    }
  }

  function handleRk9TeamConcurrencyChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setRk9TeamConcurrency(num);
  }

  async function saveRk9TeamConcurrency() {
    const current = rk9TeamConcurrency;
    const previous = rk9TeamConcurrencyCommitted.current;
    const result = await setSiteConfig("rk9_team_concurrency", current);
    if (!result.success) {
      setRk9TeamConcurrency(previous);
      toast.error("Failed to save setting");
    } else {
      rk9TeamConcurrencyCommitted.current = current;
    }
  }

  function handleRk9CronIntervalChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setRk9CronInterval(num);
  }

  async function saveRk9CronInterval() {
    const current = rk9CronInterval;
    const previous = rk9CronIntervalCommitted.current;
    const result = await setSiteConfig("rk9_cron_interval_seconds", current);
    if (!result.success) {
      setRk9CronInterval(previous);
      toast.error("Failed to save setting");
    } else {
      rk9CronIntervalCommitted.current = current;
    }
  }

  function handleLimitlessCronIntervalChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setLimitlessCronInterval(num);
  }

  async function saveLimitlessCronInterval() {
    const current = limitlessCronInterval;
    const previous = limitlessCronIntervalCommitted.current;
    const result = await setSiteConfig(
      "limitless_cron_interval_seconds",
      current
    );
    if (!result.success) {
      setLimitlessCronInterval(previous);
      toast.error("Failed to save setting");
    } else {
      limitlessCronIntervalCommitted.current = current;
    }
  }

  function handleLimitlessBatchSizeChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setLimitlessBatchSize(num);
  }

  async function saveLimitlessBatchSize() {
    const current = limitlessBatchSize;
    const previous = limitlessBatchSizeCommitted.current;
    const result = await setSiteConfig("limitless_batch_size", current);
    if (!result.success) {
      setLimitlessBatchSize(previous);
      toast.error("Failed to save setting");
    } else {
      limitlessBatchSizeCommitted.current = current;
    }
  }

  return {
    configLoading,
    rk9BackendAutoImport,
    limitlessBackendAutoImport,
    rk9TeamsPerTick,
    rk9TeamConcurrency,
    rk9CronInterval,
    limitlessCronInterval,
    limitlessBatchSize,
    handleToggleRk9Backend,
    handleToggleLimitlessBackend,
    handleRk9TeamsPerTickChange,
    saveRk9TeamsPerTick,
    handleRk9TeamConcurrencyChange,
    saveRk9TeamConcurrency,
    handleRk9CronIntervalChange,
    saveRk9CronInterval,
    handleLimitlessCronIntervalChange,
    saveLimitlessCronInterval,
    handleLimitlessBatchSizeChange,
    saveLimitlessBatchSize,
  };
}
