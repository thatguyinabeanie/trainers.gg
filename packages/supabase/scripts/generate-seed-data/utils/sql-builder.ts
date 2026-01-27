/**
 * SQL Builder Utilities
 *
 * Helper functions for building SQL statements safely.
 */

/**
 * Escape special characters in a string for SQL.
 * Does NOT wrap in quotes - use sqlString() for that.
 */
export function escapeString(value: string): string {
  // Escape single quotes by doubling them
  return value.replace(/'/g, "''");
}

/**
 * Escape and wrap a string value in single quotes for SQL.
 * Handles null and undefined.
 */
export function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${escapeString(value)}'`;
}

/**
 * Format a value for SQL based on its type.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "string") {
    return sqlString(value);
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return sqlString(value.toISOString());
  }
  if (typeof value === "object") {
    return sqlString(JSON.stringify(value));
  }
  return sqlString(String(value));
}

/**
 * Build an INSERT statement for a single row.
 */
export function buildInsert(
  table: string,
  data: Record<string, unknown>,
  options?: { onConflict?: string }
): string {
  const columns = Object.keys(data);
  const values = Object.values(data).map(formatValue);

  let sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")})`;

  if (options?.onConflict) {
    sql += ` ON CONFLICT ${options.onConflict}`;
  }

  return sql + ";";
}

/**
 * Build a batch INSERT statement for multiple rows.
 * More efficient than individual inserts.
 */
export function buildBatchInsert(
  table: string,
  rows: Array<Record<string, unknown>>,
  options?: { onConflict?: string; chunkSize?: number }
): string[] {
  if (rows.length === 0) return [];

  const chunkSize = options?.chunkSize ?? 100;
  const statements: string[] = [];

  // Get columns from first row
  const columns = Object.keys(rows[0]!);

  // Process in chunks
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valueRows = chunk.map((row) => {
      const values = columns.map((col) => formatValue(row[col]));
      return `(${values.join(", ")})`;
    });

    let sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n  ${valueRows.join(",\n  ")}`;

    if (options?.onConflict) {
      sql += `\nON CONFLICT ${options.onConflict}`;
    }

    statements.push(sql + ";");
  }

  return statements;
}

/**
 * Build an UPDATE statement.
 */
export function buildUpdate(
  table: string,
  data: Record<string, unknown>,
  where: string
): string {
  const sets = Object.entries(data)
    .map(([key, value]) => `${key} = ${formatValue(value)}`)
    .join(", ");

  return `UPDATE ${table} SET ${sets} WHERE ${where};`;
}

/**
 * Wrap SQL in a DO block for PL/pgSQL execution.
 */
export function wrapInDoBlock(sql: string, declares?: string): string {
  const declareBlock = declares ? `DECLARE\n${declares}\n` : "";
  return `DO $$\n${declareBlock}BEGIN\n${sql}\nEND $$;`;
}

/**
 * Generate a SQL file header comment.
 */
export function generateHeader(
  filename: string,
  description: string,
  dependencies?: string[]
): string {
  const lines = [
    "-- =============================================================================",
    `-- ${filename} - ${description}`,
    "-- =============================================================================",
    "-- GENERATED FILE - DO NOT EDIT MANUALLY",
    `-- Generated at: ${new Date().toISOString()}`,
    "-- IDEMPOTENT: Uses ON CONFLICT and existence checks",
  ];

  if (dependencies && dependencies.length > 0) {
    lines.push(`-- Depends on: ${dependencies.join(", ")}`);
  }

  lines.push(
    "-- =============================================================================",
    ""
  );

  return lines.join("\n");
}

/**
 * Generate a section comment.
 */
export function generateSection(title: string): string {
  return [
    "",
    "-- -----------------------------------------------------------------------------",
    `-- ${title}`,
    "-- -----------------------------------------------------------------------------",
    "",
  ].join("\n");
}

/**
 * Indent SQL content by a number of spaces.
 */
export function indent(sql: string, spaces: number = 2): string {
  const padding = " ".repeat(spaces);
  return sql
    .split("\n")
    .map((line) => (line.trim() ? padding + line : line))
    .join("\n");
}
