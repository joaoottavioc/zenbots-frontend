import { render } from "@testing-library/react";

import { formatWhatsAppText } from "./formatText";

function renderText(text: string) {
  // Wrap in a span so testing-library has a single root, and we can
  // inspect innerHTML to assert the structure of the formatted output.
  return render(<span data-testid="root">{formatWhatsAppText(text)}</span>);
}

describe("formatWhatsAppText", () => {
  it("returns empty array for empty input", () => {
    expect(formatWhatsAppText("")).toEqual([]);
  });

  it("renders plain text unchanged", () => {
    const { getByTestId } = renderText("hello world");
    expect(getByTestId("root").innerHTML).toBe("hello world");
  });

  it("renders *bold* as <strong>", () => {
    const { getByTestId } = renderText("hello *world*");
    expect(getByTestId("root").innerHTML).toBe("hello <strong>world</strong>");
  });

  it("renders _italic_ as <em>", () => {
    const { getByTestId } = renderText("_oi_ tudo bem");
    expect(getByTestId("root").innerHTML).toBe("<em>oi</em> tudo bem");
  });

  it("renders ~strike~ as <s>", () => {
    const { getByTestId } = renderText("~old price~");
    expect(getByTestId("root").innerHTML).toBe("<s>old price</s>");
  });

  it("renders `code` as <code>", () => {
    const { getByTestId } = renderText("type `oi` to start");
    // Don't pin the class string; just confirm the element exists.
    const html = getByTestId("root").innerHTML;
    expect(html).toContain("<code");
    expect(html).toContain(">oi</code>");
  });

  it("does not match mid-word markers (2*3=6 stays literal)", () => {
    const { getByTestId } = renderText("2*3=6");
    expect(getByTestId("root").innerHTML).toBe("2*3=6");
  });

  it("does not match unclosed markers", () => {
    const { getByTestId } = renderText("*unclosed bold");
    expect(getByTestId("root").innerHTML).toBe("*unclosed bold");
  });

  it("does not match markers with internal whitespace at boundaries", () => {
    // " bold " — leading/trailing whitespace inside fails the \S anchors.
    const { getByTestId } = renderText("* bold *");
    expect(getByTestId("root").innerHTML).toBe("* bold *");
  });

  it("handles multiple markers in one line", () => {
    const { getByTestId } = renderText("*um* e _dois_");
    expect(getByTestId("root").innerHTML).toBe(
      "<strong>um</strong> e <em>dois</em>",
    );
  });

  it("matches at start of string (no leading flank required)", () => {
    const { getByTestId } = renderText("*importante*: olá");
    expect(getByTestId("root").innerHTML).toBe(
      "<strong>importante</strong>: olá",
    );
  });

  it("matches at end of string (no trailing flank required)", () => {
    const { getByTestId } = renderText("preço: *R$ 25,00*");
    expect(getByTestId("root").innerHTML).toBe(
      "preço: <strong>R$ 25,00</strong>",
    );
  });

  it("does not cross newlines for a single marker pair", () => {
    const { getByTestId } = renderText("*line 1\nline 2*");
    // Neither side gets marked up — lazy match is constrained to a
    // single line, and the pair never closes.
    expect(getByTestId("root").innerHTML).toBe("*line 1\nline 2*");
  });

  it("preserves newlines as text nodes", () => {
    const { getByTestId } = renderText("first\nsecond");
    expect(getByTestId("root").innerHTML).toBe("first\nsecond");
  });

  it("renders bold inside a sentence with punctuation flanks", () => {
    const { getByTestId } = renderText("Pediu *Pizza Margherita* e refri.");
    expect(getByTestId("root").innerHTML).toBe(
      "Pediu <strong>Pizza Margherita</strong> e refri.",
    );
  });
});
