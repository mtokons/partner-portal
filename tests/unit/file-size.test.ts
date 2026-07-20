import { describe, expect, it } from "vitest";
import { MAX_CV_FILE_SIZE_BYTES, getCvFileSizeError } from "@/lib/file-size";

describe("getCvFileSizeError", () => {
  it("allows files at the 15MB limit", () => {
    expect(getCvFileSizeError(MAX_CV_FILE_SIZE_BYTES)).toBeNull();
  });

  it("rejects files larger than 15MB", () => {
    expect(getCvFileSizeError(MAX_CV_FILE_SIZE_BYTES + 1)).toBe("CV file must be 15MB or smaller.");
  });
});
