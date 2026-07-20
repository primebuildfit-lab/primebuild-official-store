import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExternalLinkAction, isSafeExternalUrl } from "@/components/ds";

/**
 * ExternalLinkAction opens only real, verified https URLs with no secrets, and is
 * disabled otherwise — it never fabricates a link (PBOS-001 · ORDEN 0.D).
 */
describe("isSafeExternalUrl", () => {
  it("accepts a plain https URL", () => {
    expect(isSafeExternalUrl("https://admin.shopify.com/store/primebuildfit")).toBe(true);
  });

  it("rejects empty, non-https, and malformed URLs", () => {
    expect(isSafeExternalUrl(null)).toBe(false);
    expect(isSafeExternalUrl("")).toBe(false);
    expect(isSafeExternalUrl("http://example.com")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("not a url")).toBe(false);
  });

  it("rejects URLs carrying token/secret-looking material", () => {
    expect(isSafeExternalUrl("https://x.com/cb?access_token=abc")).toBe(false);
    expect(isSafeExternalUrl("https://x.com/shpat_123")).toBe(false);
    expect(isSafeExternalUrl("https://user:pass@x.com/")).toBe(false);
  });
});

describe("ExternalLinkAction", () => {
  it("renders a real external anchor for a safe URL", () => {
    render(
      <ExternalLinkAction href="https://admin.shopify.com/store/x" system="Shopify Admin">
        Abrir Shopify
      </ExternalLinkAction>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://admin.shopify.com/store/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders a disabled button (no link) for an unsafe/absent URL", () => {
    render(<ExternalLinkAction href={null}>Abrir Shopify</ExternalLinkAction>);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
