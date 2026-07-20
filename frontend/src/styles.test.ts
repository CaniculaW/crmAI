import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "src/styles.css"), "utf8");

describe("compact UI density contract", () => {
  it("defines the desktop density tokens", () => {
    expect(css).toContain("--crm-font-size: 13px");
    expect(css).toContain("--crm-page-title-size: 20px");
    expect(css).toContain("--crm-header-height: 52px");
    expect(css).toContain("--crm-sidebar-width: 216px");
    expect(css).toContain("--crm-control-height: 32px");
  });

  it("keeps mobile controls touchable", () => {
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*--crm-control-height:\s*36px/);
  });

  it("applies compact table and form spacing", () => {
    expect(css).toMatch(/\.ant-table-wrapper[\s\S]*\.ant-table-cell[\s\S]*padding:\s*9px 10px/);
    expect(css).toMatch(/\.ant-form-item\s*\{[\s\S]*margin-bottom:\s*12px/);
  });
});
