import { describe, expect, it } from "vitest";
import { parseCsv, toCsv, unescapeCell } from "@/lib/csv";

describe("toCsv", () => {
  it("joins cells with commas and rows with CRLF", () => {
    expect(toCsv([["a", "b"], [1, 2]])).toBe("a,b\r\n1,2\r\n");
  });

  it("quotes cells containing commas, quotes or newlines", () => {
    expect(toCsv([['He said "hi"', "a,b", "line1\nline2"]])).toBe('"He said ""hi""","a,b","line1\nline2"\r\n');
  });

  it("writes null and undefined as empty cells", () => {
    expect(toCsv([["a", null, undefined, "d"]])).toBe("a,,,d\r\n");
  });

  it("neutralises spreadsheet formulas in text cells", () => {
    expect(toCsv([["=SUM(A1)", "+1", "-2", "@x"]])).toBe("'=SUM(A1),'+1,'-2,'@x\r\n");
  });

  it("does not alter genuine numbers", () => {
    expect(toCsv([[-5, 12.5]])).toBe("-5,12.5\r\n");
  });
});

describe("parseCsv", () => {
  it("parses simple rows, with or without a trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("handles quoted cells, escaped quotes and embedded newlines", () => {
    expect(parseCsv('"a,b","He said ""hi""","x\ny"')).toEqual([["a,b", 'He said "hi"', "x\ny"]]);
  });

  it("strips a byte order mark", () => {
    expect(parseCsv("﻿name,price\nTea,10")).toEqual([["name", "price"], ["Tea", "10"]]);
  });

  it("keeps empty cells and skips blank lines", () => {
    expect(parseCsv("a,,c\n\n,,\nd,e,f")).toEqual([["a", "", "c"], ["d", "e", "f"]]);
  });

  it("rejects an unclosed quote", () => {
    expect(() => parseCsv('a,"b')).toThrow(/unclosed/i);
  });

  it("round-trips what toCsv writes, including formula guards", () => {
    const rows = [["Name", "Note"], ["=cmd", 'say "yes", ok'], ["Plain", ""]];
    const parsed = parseCsv(toCsv(rows)).map((r) => r.map(unescapeCell));
    expect(parsed).toEqual(rows);
  });
});

describe("unescapeCell", () => {
  it("only removes the guard apostrophe in front of formula characters", () => {
    expect(unescapeCell("'=1+1")).toBe("=1+1");
    expect(unescapeCell("'tis")).toBe("'tis");
    expect(unescapeCell("plain")).toBe("plain");
  });
});
