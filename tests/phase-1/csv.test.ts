import { describe, expect, it } from "vitest"

import { escapeCsvCell, toCsv } from "../../lib/admin/csv"

describe("admin CSV export", () => {
  it("[P1-EXP-04] neutralises spreadsheet formulas and escapes quotes", () => {
    expect(escapeCsvCell("=HYPERLINK(\"http://evil\")")).toBe(
      '"\'=HYPERLINK(""http://evil"")"',
    )
    expect(escapeCsvCell("+62 800 1234")).toBe('"\'+62 800 1234"')
    expect(escapeCsvCell("-1")).toBe('"\'-1"')
    expect(escapeCsvCell("@user")).toBe('"\'@user"')
    expect(escapeCsvCell("Kain, soga")).toBe('"Kain, soga"')
  })

  it("renders rows with a stable header and line breaks", () => {
    expect(
      toCsv([
        ["name", "amount"],
        ["Anisa", 1_450_000],
      ]),
    ).toBe('"name","amount"\n"Anisa","1450000"')
  })
})
