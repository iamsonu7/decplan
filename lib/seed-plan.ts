// The Dec 1-26 plan as data. Pure: no database access, so it can be tested.
import { dayRange } from "@/lib/dates";

export type SeedItem = { date: string; title: string };
export type SeedBlock = { name: string; startDate: string; endDate: string; output: string; items: SeedItem[] };

export function decemberPlan(year = 2026) {
  const d = (day: number) => `${year}-12-${String(day).padStart(2, "0")}`;
  // One item per day for a task that spans several days.
  const span = (from: number, to: number, title: string): SeedItem[] =>
    dayRange(d(from), d(to)).map((date, i, all) => ({ date, title: `${title} (day ${i + 1} of ${all.length})` }));

  const blocks: SeedBlock[] = [
    {
      name: "Block 1: Accounting",
      startDate: d(1),
      endDate: d(6),
      output: "A one-page breakdown of how the company makes and spends money",
      items: [
        { date: d(1), title: "Pick one listed Indian company and download its last 3 annual reports" },
        ...span(2, 5, "Learn the income statement, balance sheet and cash flow statement on that company's numbers"),
        { date: d(6), title: "Output: one-page breakdown of how the company makes and spends money" },
      ],
    },
    {
      name: "Block 2: Modeling",
      startDate: d(7),
      endDate: d(13),
      output: "A working three-statement model",
      items: [
        ...span(7, 9, "Rebuild 3 past years in Excel by hand"),
        ...span(10, 12, "Forecast 3 years ahead with clear assumptions"),
        { date: d(13), title: "Output: a working three-statement model" },
      ],
    },
    {
      name: "Block 3: Valuation",
      startDate: d(14),
      endDate: d(20),
      output: "A 2-page memo on what it's worth and who should buy or fund it",
      items: [
        ...span(14, 16, "DCF valuation on the model"),
        ...span(17, 18, "Compare against 4-5 similar listed companies"),
        ...span(19, 20, "Output: 2-page memo on what it's worth and who should buy or fund it"),
      ],
    },
    {
      name: "Block 4: Outreach",
      startDate: d(21),
      endDate: d(26),
      output: "50 emails sent, 10 alumni messaged, follow-ups scheduled",
      items: [
        { date: d(21), title: "Adapt my outreach pipeline and write the email" },
        ...span(22, 23, "Send 50 emails with the memo attached"),
        { date: d(24), title: "Message 10 IIT alumni in finance" },
        { date: d(25), title: "Rest" },
        { date: d(26), title: "Review the month and schedule follow-ups for Jan 4-6" },
      ],
    },
  ];

  // "Running alongside" items, not tied to a block.
  const start = d(1);
  const end = d(26);
  const sundays = dayRange(start, end).filter((day) => new Date(`${day}T00:00:00Z`).getUTCDay() === 0);
  const ownerTalkDays = [9, 11, 14, 16, 18]; // spread over weeks 2-3
  const running: SeedItem[] = [
    ...dayRange(d(1), d(20)).map((date) => ({ date, title: "Add 3 names to the outreach list (target 50+ by Dec 21)" })),
    ...ownerTalkDays.map((day, i) => ({ date: d(day), title: `Talk to a local business owner about how they raise money (${i + 1} of 5)` })),
    ...sundays.flatMap((date) => [
      { date, title: "LinkedIn post" },
      { date, title: "Weekly review" },
    ]),
  ];

  return {
    plan: {
      name: `December ${year} plan`,
      startDate: start,
      endDate: end,
      targets: { breakdown: 1, model: 1, memo: 1, emails: 50, alumniMessages: 10, ownerConversations: 5 },
    },
    blocks,
    running,
    deliverables: ["One-page breakdown", "Three-statement model", "Valuation memo"],
  };
}
