import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";

// ---------- Test data ----------

interface TestRow {
  id: number;
  name: string;
  email: string;
}

// Simple columns for testing — no sorting, no custom rendering
const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
];

/** Generate `count` rows of test data. */
function generateRows(count: number): TestRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
  }));
}

// ---------- Tests ----------

describe("DataTable", () => {
  // -- Empty state --
  describe("empty state", () => {
    it("renders 'No results.' when data is empty", () => {
      render(<DataTable columns={columns} data={[]} />);

      expect(screen.getByText("No results.")).toBeInTheDocument();
    });
  });

  // -- Default pagination (manualPagination=false) --
  describe("default pagination (client-side)", () => {
    it("does not render pagination controls when there are 10 or fewer rows", () => {
      // 10 rows = exactly one page, so no pagination needed
      const rows = generateRows(10);
      render(<DataTable columns={columns} data={rows} />);

      // All 10 rows should be visible
      for (const row of rows) {
        expect(screen.getByText(row.name)).toBeInTheDocument();
      }

      // No pagination controls
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
      expect(screen.queryByText(/^Page /)).not.toBeInTheDocument();
    });

    it("renders pagination controls when there are more than 10 rows", () => {
      const rows = generateRows(15);
      render(<DataTable columns={columns} data={rows} />);

      // Pagination UI should be present
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    it("shows only the first 10 rows on page 1", () => {
      const rows = generateRows(15);
      render(<DataTable columns={columns} data={rows} />);

      // First 10 rows visible
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`User ${i}`)).toBeInTheDocument();
      }

      // Rows 11-15 should NOT be in the DOM on page 1
      for (let i = 11; i <= 15; i++) {
        expect(screen.queryByText(`User ${i}`)).not.toBeInTheDocument();
      }
    });

    it("navigates to the next page and shows remaining rows", async () => {
      const user = userEvent.setup();
      const rows = generateRows(15);
      render(<DataTable columns={columns} data={rows} />);

      // Click "Next"
      await user.click(screen.getByText("Next"));

      // Page 2 should now show rows 11-15
      for (let i = 11; i <= 15; i++) {
        expect(screen.getByText(`User ${i}`)).toBeInTheDocument();
      }

      // Rows 1-10 should no longer be visible
      for (let i = 1; i <= 10; i++) {
        expect(screen.queryByText(`User ${i}`)).not.toBeInTheDocument();
      }

      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    });

    it("disables the Previous button on the first page", () => {
      const rows = generateRows(15);
      render(<DataTable columns={columns} data={rows} />);

      expect(screen.getByText("Previous")).toBeDisabled();
      expect(screen.getByText("Next")).not.toBeDisabled();
    });

    it("disables the Next button on the last page", async () => {
      const user = userEvent.setup();
      const rows = generateRows(15);
      render(<DataTable columns={columns} data={rows} />);

      // Navigate to the last page
      await user.click(screen.getByText("Next"));

      expect(screen.getByText("Next")).toBeDisabled();
      expect(screen.getByText("Previous")).not.toBeDisabled();
    });
  });

  // -- Manual pagination (manualPagination=true) --
  describe("manualPagination={true}", () => {
    it("does not render pagination controls", () => {
      const rows = generateRows(15);
      render(
        <DataTable columns={columns} data={rows} manualPagination={true} />
      );

      // No pagination buttons or page indicator
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
      expect(screen.queryByText(/^Page /)).not.toBeInTheDocument();
    });

    it("renders all rows without client-side slicing", () => {
      const rows = generateRows(25);
      render(
        <DataTable columns={columns} data={rows} manualPagination={true} />
      );

      // Every single row should be visible in the DOM
      for (const row of rows) {
        expect(screen.getByText(row.name)).toBeInTheDocument();
      }
    });

    it("renders all rows even with a small dataset", () => {
      const rows = generateRows(5);
      render(
        <DataTable columns={columns} data={rows} manualPagination={true} />
      );

      for (const row of rows) {
        expect(screen.getByText(row.name)).toBeInTheDocument();
      }

      // Still no pagination controls
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });
  });

  // -- onRowClick --
  describe("onRowClick", () => {
    it("calls onRowClick with the row data when a row is clicked", async () => {
      const user = userEvent.setup();
      const handleRowClick = jest.fn();
      const rows = generateRows(3);

      render(
        <DataTable columns={columns} data={rows} onRowClick={handleRowClick} />
      );

      // Click the row containing "User 2"
      const row2Cell = screen.getByText("User 2");
      // The click target is the <tr>, so click the cell (event bubbles up)
      await user.click(row2Cell);

      expect(handleRowClick).toHaveBeenCalledTimes(1);
      expect(handleRowClick).toHaveBeenCalledWith({
        id: 2,
        name: "User 2",
        email: "user2@example.com",
      });
    });

    it("adds cursor-pointer class to rows when onRowClick is provided", () => {
      const rows = generateRows(2);
      render(<DataTable columns={columns} data={rows} onRowClick={() => {}} />);

      // Get table body rows (skip the header row)
      const tableBody = screen.getAllByRole("rowgroup")[1]!;
      const bodyRows = within(tableBody).getAllByRole("row");

      for (const row of bodyRows) {
        expect(row).toHaveClass("cursor-pointer");
      }
    });

    it("does not add cursor-pointer class when onRowClick is not provided", () => {
      const rows = generateRows(2);
      render(<DataTable columns={columns} data={rows} />);

      const tableBody = screen.getAllByRole("rowgroup")[1]!;
      const bodyRows = within(tableBody).getAllByRole("row");

      for (const row of bodyRows) {
        expect(row).not.toHaveClass("cursor-pointer");
      }
    });
  });

  // -- Column headers --
  describe("column rendering", () => {
    it("renders all column headers", () => {
      render(<DataTable columns={columns} data={generateRows(1)} />);

      expect(screen.getByText("ID")).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("renders cell values for each row", () => {
      const rows = generateRows(3);
      render(<DataTable columns={columns} data={rows} />);

      // Spot-check a few cells
      expect(screen.getByText("user1@example.com")).toBeInTheDocument();
      expect(screen.getByText("user3@example.com")).toBeInTheDocument();
    });
  });
});
