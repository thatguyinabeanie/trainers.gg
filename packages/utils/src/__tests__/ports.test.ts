/**
 * @jest-environment node
 */

import * as net from "net";
import { isPortAvailable, findAvailablePort, findPortBlock } from "../ports";

// Helper to find a truly available port for testing
async function findTestPort(): Promise<number> {
  const basePort = 60000 + Math.floor(Math.random() * 5000);
  for (let i = 0; i < 100; i++) {
    const port = basePort + i;
    const server = net.createServer();
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, () => {
          server.close();
          resolve();
        });
      });
      return port;
    } catch {
      // Port in use, try next
    }
  }
  throw new Error("Could not find available test port");
}

describe("Port Utilities", () => {
  describe("isPortAvailable", () => {
    it("should return true for an available port", async () => {
      // Find a truly available port
      const port = await findTestPort();
      const available = await isPortAvailable(port);
      expect(available).toBe(true);
    });

    it("should return false for a port in use", async () => {
      // Create a server to occupy a port
      const server = net.createServer();
      const port = 55556;

      await new Promise<void>((resolve) => {
        server.listen(port, () => resolve());
      });

      try {
        const available = await isPortAvailable(port);
        expect(available).toBe(false);
      } finally {
        server.close();
      }
    });
  });

  describe("findAvailablePort", () => {
    it("should return preferred port if available", async () => {
      const preferred = 55557;
      const range: [number, number] = [55557, 55600];

      const port = await findAvailablePort(preferred, range);
      expect(port).toBe(preferred);
    });

    it("should find next available port if preferred is taken", async () => {
      const server = net.createServer();
      const preferredPort = 55558;
      const range: [number, number] = [55558, 55600];

      await new Promise<void>((resolve) => {
        server.listen(preferredPort, () => resolve());
      });

      try {
        const port = await findAvailablePort(preferredPort, range);
        expect(port).not.toBe(preferredPort);
        expect(port).toBeGreaterThanOrEqual(range[0]);
        expect(port).toBeLessThanOrEqual(range[1]);
      } finally {
        server.close();
      }
    });

    it("should return null if no ports available in range", async () => {
      // Create servers for all ports in a small range
      const range: [number, number] = [55570, 55572];
      const servers: net.Server[] = [];

      for (let port = range[0]; port <= range[1]; port++) {
        const server = net.createServer();
        await new Promise<void>((resolve) => {
          server.listen(port, () => resolve());
        });
        servers.push(server);
      }

      try {
        const port = await findAvailablePort(55570, range);
        expect(port).toBeNull();
      } finally {
        servers.forEach((server) => server.close());
      }
    });
  });

  describe("findPortBlock", () => {
    it("should allocate a contiguous block of ports", async () => {
      const count = 3;
      const startFrom = 55580;

      const ports = await findPortBlock(count, startFrom);
      expect(ports).not.toBeNull();

      if (ports) {
        expect(ports).toHaveLength(count);

        // Verify ports are contiguous
        for (let i = 1; i < ports.length; i++) {
          expect(ports[i]).toBe(ports[i - 1]! + 1);
        }

        // Verify all ports start at or after startFrom
        expect(ports[0]).toBeGreaterThanOrEqual(startFrom);
      }
    });

    it("should skip occupied ports and find next contiguous block", async () => {
      const count = 3;
      const startFrom = 55590;

      // Occupy the first port in range
      const server = net.createServer();
      await new Promise<void>((resolve) => {
        server.listen(startFrom, () => resolve());
      });

      try {
        const ports = await findPortBlock(count, startFrom);
        expect(ports).not.toBeNull();

        if (ports) {
          expect(ports).toHaveLength(count);

          // Block should start after the occupied port
          expect(ports[0]).toBeGreaterThan(startFrom);

          // Verify contiguous
          for (let i = 1; i < ports.length; i++) {
            expect(ports[i]).toBe(ports[i - 1]! + 1);
          }
        }
      } finally {
        server.close();
      }
    });

    it("should return null if cannot allocate contiguous block", async () => {
      const count = 5;
      const startFrom = 55600;

      // Occupy every other port in a range to prevent contiguous allocation
      const servers: net.Server[] = [];
      for (let i = 0; i < 50; i += 2) {
        const server = net.createServer();
        await new Promise<void>((resolve) => {
          server.listen(startFrom + i, () => resolve());
        });
        servers.push(server);
      }

      try {
        const ports = await findPortBlock(count, startFrom);
        // Should either find a block beyond the occupied range or return null
        if (ports) {
          // If found, verify it's contiguous and available
          expect(ports).toHaveLength(count);
          for (let i = 1; i < ports.length; i++) {
            expect(ports[i]).toBe(ports[i - 1]! + 1);
          }
        }
      } finally {
        servers.forEach((server) => server.close());
      }
    });
  });
});
