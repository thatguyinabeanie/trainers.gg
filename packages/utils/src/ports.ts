/**
 * Port detection utilities for worktree-aware development
 *
 * Provides utilities for finding available ports and allocating port blocks
 * for multiple services running in parallel across git worktrees.
 */

import * as net from "net";

/**
 * Check if a specific port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Find the next available port in a given range
 *
 * @param preferred - Preferred port to try first
 * @param range - [min, max] range to search within
 * @returns Available port number, or null if none found
 */
export async function findAvailablePort(
  preferred: number,
  range: [number, number]
): Promise<number | null> {
  const [min, max] = range;

  // Try preferred port first
  if (preferred >= min && preferred <= max) {
    if (await isPortAvailable(preferred)) {
      return preferred;
    }
  }

  // Search sequentially through range
  for (let port = min; port <= max; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  return null;
}

/**
 * Allocate a contiguous block of ports
 *
 * @param count - Number of contiguous ports needed
 * @param startFrom - Port to start searching from
 * @returns Array of allocated port numbers, or null if block not available
 */
export async function findPortBlock(
  count: number,
  startFrom: number
): Promise<number[] | null> {
  const maxAttempts = 100;
  let startPort = startFrom;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ports: number[] = [];
    let allAvailable = true;

    // Try to allocate contiguous block
    for (let i = 0; i < count; i++) {
      const port = startPort + i;
      if (await isPortAvailable(port)) {
        ports.push(port);
      } else {
        allAvailable = false;
        startPort = port + 1; // Jump past unavailable port
        break;
      }
    }

    if (allAvailable && ports.length === count) {
      return ports;
    }
  }

  return null;
}
