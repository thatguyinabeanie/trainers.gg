import { parseEventsPage } from "../scraper";

describe("parseEventsPage", () => {
  it("returns an empty array for markup with no event rows", () => {
    const html = "<html><body><table></table></body></html>";
    expect(parseEventsPage(html)).toEqual([]);
  });
});
