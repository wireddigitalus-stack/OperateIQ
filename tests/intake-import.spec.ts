import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";
import { deflateRawSync } from "node:zlib";
import {
  inspectSpreadsheetBuffer,
  normalizeFlexibleDate,
  parseCleanMoney,
} from "../src/lib/spreadsheet";
import {
  computeFirstEscalationDate,
  extractDocxText,
  inferLeaseStatus,
  normalizeExtractedCandidate,
  prepareDocumentForGemini,
  redactSensitivePii,
} from "../src/lib/lease-extraction";

/** Builds a minimal valid .docx (PKZIP) buffer containing word/document.xml for unit testing */
function createMinimalDocxBuffer(xmlBodyParagraphs: string[]): Buffer {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${xmlBodyParagraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("")}
  </w:body>
</w:document>`;

  const entryName = Buffer.from("word/document.xml", "utf8");
  const uncompressed = Buffer.from(xml, "utf8");
  const compressed = deflateRawSync(uncompressed);

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(8, 8); // deflate
  localHeader.writeUInt32LE(compressed.length, 18);
  localHeader.writeUInt32LE(uncompressed.length, 22);
  localHeader.writeUInt16LE(entryName.length, 26);

  const cdOffset = localHeader.length + entryName.length + compressed.length;
  const cdHeader = Buffer.alloc(46);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt16LE(8, 10);
  cdHeader.writeUInt32LE(compressed.length, 20);
  cdHeader.writeUInt32LE(uncompressed.length, 24);
  cdHeader.writeUInt16LE(entryName.length, 28);
  cdHeader.writeUInt32LE(0, 42);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdHeader.length + entryName.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);

  return Buffer.concat([localHeader, entryName, compressed, cdHeader, entryName, eocd]);
}

test.describe("PropOpsIQ Intake & Importing System Suite", () => {
  test("extracts .docx lease suites cleanly and redacts full SSNs while preserving EINs", () => {
    const docx = createMinimalDocxBuffer([
      "PropOpsIQ — System Test Leases &amp; Agreement Suite",
      "Document 1: Commercial NNN Lease — Apex Plaza, Suite 100 — Summit Tech LLC (EIN: 12-3456789)",
      "Document 2: Multi-Family Lease — Oakview Apartments, Unit 2B — Jordan Miller (SSN: 123-45-8812)",
      "Document 3: Single-Family Lease — 742 Evergreen Terrace — Marcus Vance &amp; Sarah Vance",
    ]);

    const prepared = prepareDocumentForGemini(
      docx,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "test_leases.docx"
    );
    expect(prepared.kind).toBe("text");
    if (prepared.kind === "text") {
      expect(prepared.extractedText).toContain("Summit Tech LLC (EIN: 12-3456789)");
      // Full SSN must be masked automatically
      expect(prepared.extractedText).not.toContain("123-45-8812");
      expect(prepared.extractedText).toContain("***-**-8812");
      expect(prepared.extractedText).toContain("Marcus Vance & Sarah Vance");
    }

    // Verify extractDocxText & redactSensitivePii edge cases directly
    expect(redactSensitivePii("Tenant SSN 412-88-9901, Phone 423-555-0199, Start 2025-01-01")).toBe(
      "Tenant SSN ***-**-9901, Phone 423-555-0199, Start 2025-01-01"
    );
    expect(extractDocxText(docx)).toContain("Apex Plaza");
  });

  test("maps all 3 Standardized Test Leases without losing NNN, pet rent, landscaping, escalations, or HVAC schedule", () => {
    const todayIso = "2026-11-11";
    const sourceUrl = "/api/tenant-upload?path=org_test%2Fintake-staging%2Fsuite.docx";

    // 1. Commercial NNN Lease (Summit Tech LLC)
    const comm = normalizeExtractedCandidate(
      {
        name: "Summit Tech LLC",
        guarantor: "Jane Doe",
        building: "Apex Plaza",
        propertyCity: "Metropolis",
        propertyType: "Commercial",
        unit: "Suite 100",
        unitSqft: 2400,
        monthlyRent: 5200,
        nnnFee: 450,
        securityDeposit: 10400,
        secDepReceived: true,
        secDepNotes: "Interest-bearing escrow",
        escalationPct: 3,
        leaseStart: "2025-01-01",
        leaseEnd: "2029-12-31",
        notes: "EIN: 12-3456789 · 14.2% NNN share",
      },
      0,
      {
        totalRecords: 3,
        detectedBuildingName: "Apex Plaza",
        sourceDocUrl: sourceUrl,
        sourceDocName: "suite.docx",
        todayIso,
      }
    );

    expect(comm.building).toBe("Apex Plaza");
    expect(comm.propertyType).toBe("Commercial");
    expect(comm.unitSqft).toBe(2400);
    expect(comm.monthlyRent).toBe(5200);
    expect(comm.nnnFee).toBe(450);
    expect(comm.escalationPct).toBe(3);
    expect(comm.escalationDate).toBe("2026-01-01");
    expect(comm.contactName).toContain("Jane Doe");
    expect(comm.secDepReceived).toBe(true);
    expect(comm.status).toBe("active");
    expect(comm.isExpiredHoldover).toBe(false);
    expect(comm.sourceDocUrl).toBe(sourceUrl);

    // 2. Multi-Family Residential Lease (Jordan Miller)
    const apt = normalizeExtractedCandidate(
      {
        name: "Jordan Miller",
        email: "jordan.m@gmail.com",
        building: "Oakview Apartments",
        propertyType: "Multi-Family",
        unit: "Unit 2B",
        monthlyRent: 1650,
        utilitiesFee: 35,
        utilitiesFeeLabel: "Pet Rent",
        securityDeposit: 1650,
        nonRefundableDeposit: 250,
        secDepReceived: true,
        lateFeeRule: "$82.50 (5%) after 5th day",
        leaseStart: "2025-08-01",
        leaseEnd: "2026-07-31",
        notes: "1 Golden Retriever (45 lbs) · Electric Meter #40291",
      },
      1,
      {
        totalRecords: 3,
        detectedBuildingName: "Apex Plaza", // Must NOT bleed onto Record 2!
        sourceDocUrl: sourceUrl,
        sourceDocName: "suite.docx",
        todayIso,
      }
    );

    expect(apt.building).toBe("Oakview Apartments");
    expect(apt.monthlyRent).toBe(1650);
    expect(apt.utilitiesFee).toBe(35);
    expect(apt.secDepNotes).toContain("250");
    expect(apt.notes).toContain("Pet Rent: $35/mo");
    expect(apt.notes).toContain("$82.50 (5%) after 5th day");
    expect(apt.status).toBe("expired");
    expect(apt.isExpiredHoldover).toBe(true);

    // 3. Single-Family Residence Lease (Marcus & Sarah Vance)
    const sfr = normalizeExtractedCandidate(
      {
        name: "Marcus Vance",
        contactName: "Sarah Vance",
        email: "m.vance@live.com",
        building: "742 Evergreen Terrace",
        propertyCity: "Springfield",
        propertyType: "Single-Family",
        unit: "",
        monthlyRent: 2400,
        utilitiesFee: 50,
        utilitiesFeeLabel: "Landscaping Fee",
        securityDeposit: 3000,
        secDepReceived: true,
        hvacFilterIntervalDays: 60,
        leaseStart: "2024-11-01",
        leaseEnd: "2025-10-31",
        notes: "Evergreen Woods HOA compliance",
      },
      2,
      {
        totalRecords: 3,
        detectedBuildingName: "Apex Plaza",
        sourceDocUrl: sourceUrl,
        sourceDocName: "suite.docx",
        todayIso,
      }
    );

    expect(sfr.building).toBe("742 Evergreen Terrace");
    expect(sfr.propertyType).toBe("Single-Family");
    expect(sfr.unit).toBe("Main");
    expect(sfr.monthlyRent).toBe(2400);
    expect(sfr.utilitiesFee).toBe(50);
    expect(sfr.hvacFilterIntervalDays).toBe(60);
    expect(sfr.status).toBe("expired");
    expect(sfr.isExpiredHoldover).toBe(true);

    expect(computeFirstEscalationDate("2025-01-01")).toBe("2026-01-01");
    expect(inferLeaseStatus("2027-01-01", "2028-01-01", todayIso).status).toBe("pending");
  });

  test("smart spreadsheet parser skips AppFolio banner rows, picks Rent Roll tab, and drops Total rows", async () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive Cover Page (noise)
    const coverWs = XLSX.utils.aoa_to_sheet([
      ["Portfolio Cover Sheet"],
      ["Prepared for Metro Holdings"],
    ]);
    XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

    // Sheet 2: Real Rent Roll with 3 banner rows + header on Row 4 + Grand Total row at bottom
    const rentRollWs = XLSX.utils.aoa_to_sheet([
      ["Oakview Property Management LLC — Rent Roll As Of 11/11/2026"],
      ["Generated by AppFolio Property Manager"],
      [""],
      ["Tenant Name", "Building", "Unit", "Monthly Rent", "Pet Fee", "Lease Start", "Lease End"],
      ["Summit Tech LLC", "Apex Plaza", "Suite 100", "$5,200.00", "$0.00", 45658, "12/31/2029"],
      ["Jordan Miller", "Oakview Apartments", "Unit 2B", "$1,650.00", "$35.50", "Aug 1, 2025", "2026-07-31"],
      ["Grand Total", "", "", "$6,850.00", "$35.50", "", ""],
    ]);
    XLSX.utils.book_append_sheet(wb, rentRollWs, "Rent Roll");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const result = await inspectSpreadsheetBuffer(buf);

    expect(result.selectedSheetName).toBe("Rent Roll");
    expect(result.detectedHeaderRowIndex).toBe(3);
    expect(result.skippedBannerRows).toBe(3);
    expect(result.skippedSummaryRows).toBe(1);
    expect(result.rows).toHaveLength(2);

    expect(result.rows[0]["Tenant Name"]).toBe("Summit Tech LLC");
    expect(parseCleanMoney(result.rows[0]["Monthly Rent"])).toBe(5200);
    expect(parseCleanMoney(result.rows[1]["Pet Fee"])).toBe(35.5);

    // Date normalizer checks (UTC-safe Excel serial, US date, written month)
    expect(normalizeFlexibleDate(result.rows[0]["Lease Start"])).toBe("2025-01-01");
    expect(normalizeFlexibleDate(result.rows[0]["Lease End"])).toBe("2029-12-31");
    expect(normalizeFlexibleDate(result.rows[1]["Lease Start"])).toBe("2025-08-01");
  });

  test("unauthenticated intake OCR and tenant-upload endpoints enforce 401", async ({ request }) => {
    const ocrRes = await request.post("/api/ai/intake-ocr", {
      data: { filename: "test.docx", imageBase64: "dGVzdA==" },
    });
    expect(ocrRes.status()).toBe(401);

    const signRes = await request.post("/api/tenant-upload", {
      data: { filename: "lease.pdf", tenantId: "intake-staging", size: 1024 },
    });
    expect(signRes.status()).toBe(401);
  });
});
