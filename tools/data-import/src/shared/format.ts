// Copied from packages/pokemon/src/regulation-calendar.ts — do not import @trainers/pokemon here

interface RegulationPeriod {
  start: string;
  end: string;
  formatId: string;
  regulation: string;
  label: string;
}

const REGULATION_CALENDAR: readonly RegulationPeriod[] = [
  {
    start: "2009-03-01",
    end: "2009-08-31",
    formatId: "gen4vgc2009",
    regulation: "VGC 2009",
    label: "DP: VGC 2009",
  },
  {
    start: "2009-09-01",
    end: "2010-08-31",
    formatId: "gen4vgc2010",
    regulation: "VGC 2010",
    label: "DP: VGC 2010",
  },
  {
    start: "2011-03-01",
    end: "2011-08-31",
    formatId: "gen5vgc2011",
    regulation: "VGC 2011",
    label: "BW: VGC 2011",
  },
  {
    start: "2011-09-01",
    end: "2012-08-31",
    formatId: "gen5vgc2012",
    regulation: "VGC 2012",
    label: "BW: VGC 2012",
  },
  {
    start: "2012-09-01",
    end: "2013-08-31",
    formatId: "gen5vgc2013",
    regulation: "VGC 2013",
    label: "BW: VGC 2013",
  },
  {
    start: "2013-10-01",
    end: "2014-08-31",
    formatId: "gen6vgc2014",
    regulation: "VGC 2014",
    label: "XY: VGC 2014",
  },
  {
    start: "2014-09-01",
    end: "2015-08-31",
    formatId: "gen6vgc2015",
    regulation: "VGC 2015",
    label: "XY: VGC 2015",
  },
  {
    start: "2015-09-01",
    end: "2016-08-31",
    formatId: "gen6vgc2016",
    regulation: "VGC 2016",
    label: "XY: VGC 2016",
  },
  {
    start: "2016-11-01",
    end: "2017-08-31",
    formatId: "gen7vgc2017",
    regulation: "VGC 2017",
    label: "SM: VGC 2017",
  },
  {
    start: "2017-09-01",
    end: "2018-08-31",
    formatId: "gen7vgc2018",
    regulation: "VGC 2018",
    label: "SM: VGC 2018",
  },
  {
    start: "2019-01-04",
    end: "2019-04-01",
    formatId: "gen7vgc2019sunseries",
    regulation: "Sun Series",
    label: "SM: Sun Series",
  },
  {
    start: "2019-04-02",
    end: "2019-07-14",
    formatId: "gen7vgc2019moonseries",
    regulation: "Moon Series",
    label: "SM: Moon Series",
  },
  {
    start: "2019-07-15",
    end: "2019-11-14",
    formatId: "gen7vgc2019ultraseries",
    regulation: "Ultra Series",
    label: "SM: Ultra Series",
  },
  {
    start: "2020-01-01",
    end: "2021-04-30",
    formatId: "gen8vgc2020",
    regulation: "VGC 2020",
    label: "SwSh: VGC 2020",
  },
  {
    start: "2021-05-01",
    end: "2021-07-31",
    formatId: "gen8vgc2021series9",
    regulation: "Series 9",
    label: "SwSh: Series 9",
  },
  {
    start: "2021-08-01",
    end: "2021-10-31",
    formatId: "gen8vgc2021series10",
    regulation: "Series 10",
    label: "SwSh: Series 10",
  },
  {
    start: "2021-11-01",
    end: "2022-01-31",
    formatId: "gen8vgc2021series11",
    regulation: "Series 11",
    label: "SwSh: Series 11",
  },
  {
    start: "2022-02-01",
    end: "2022-12-01",
    formatId: "gen8vgc2022",
    regulation: "Series 12/13",
    label: "SwSh: VGC 2022",
  },
  {
    start: "2022-12-02",
    end: "2023-01-31",
    formatId: "gen9vgc2023rega",
    regulation: "A",
    label: "Reg A",
  },
  {
    start: "2023-02-01",
    end: "2023-03-31",
    formatId: "gen9vgc2023regb",
    regulation: "B",
    label: "Reg B",
  },
  {
    start: "2023-04-01",
    end: "2023-05-30",
    formatId: "gen9vgc2023regc",
    regulation: "C",
    label: "Reg C",
  },
  {
    start: "2023-06-01",
    end: "2023-09-30",
    formatId: "gen9vgc2023regd",
    regulation: "D",
    label: "Reg D",
  },
  {
    start: "2023-10-01",
    end: "2024-01-03",
    formatId: "gen9vgc2024rege",
    regulation: "E",
    label: "Reg E",
  },
  {
    start: "2024-01-04",
    end: "2024-04-30",
    formatId: "gen9vgc2024regf",
    regulation: "F",
    label: "Reg F",
  },
  {
    start: "2024-05-01",
    end: "2024-08-31",
    formatId: "gen9vgc2024regg",
    regulation: "G",
    label: "Reg G (period 1)",
  },
  {
    start: "2024-09-01",
    end: "2025-01-05",
    formatId: "gen9vgc2025regh",
    regulation: "H",
    label: "Reg H",
  },
  {
    start: "2025-01-06",
    end: "2025-04-30",
    formatId: "gen9vgc2025regg",
    regulation: "G",
    label: "Reg G (period 2)",
  },
  {
    start: "2025-05-01",
    end: "2025-08-31",
    formatId: "gen9vgc2025regi",
    regulation: "I",
    label: "Reg I (period 1)",
  },
  {
    start: "2025-09-01",
    end: "2026-01-04",
    formatId: "gen9vgc2025regj",
    regulation: "J",
    label: "Reg J",
  },
  {
    start: "2026-01-05",
    end: "2026-08-31",
    formatId: "gen9vgc2026regi",
    regulation: "I",
    label: "Reg I (period 2)",
  },
] as const;

const CHAMPIONS_CALENDAR: readonly RegulationPeriod[] = [
  {
    start: "2026-05-01",
    end: "2026-08-31",
    formatId: "gen9championsvgc2026regma",
    regulation: "M-A",
    label: "Champions: Reg M-A",
  },
] as const;

export function getSvFormatForDate(dateStart: string): string | null {
  if (!dateStart) return null;

  for (const period of REGULATION_CALENDAR) {
    if (dateStart >= period.start && dateStart <= period.end) {
      return period.formatId;
    }
  }

  return null;
}

export function getChampionsFormatForDate(dateStart: string): string | null {
  if (!dateStart) return null;

  for (const period of CHAMPIONS_CALENDAR) {
    if (dateStart >= period.start && dateStart <= period.end) {
      return period.formatId;
    }
  }

  return null;
}
