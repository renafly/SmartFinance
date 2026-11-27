import type { Note } from "../types";
import {
  draftsEqual,
  filterNotes,
  isBlankDraft,
  notePreview,
  normalizeForSearch,
  rowToNote,
  sortNotes,
  upsertNote,
} from "./note-view-model";

function note(overrides: Partial<Note> & { id: string }): Note {
  return {
    title: "",
    content: "",
    version: 1,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  };
}

const notes = [
  note({ id: "a", title: "Groceries", content: "Milk, eggs, café", createdAt: "2026-10-01T09:00:00Z", updatedAt: "2026-10-05T09:00:00Z" }),
  note({ id: "b", title: "Holiday plan", content: "Book the Lisbon flights", createdAt: "2026-10-03T09:00:00Z", updatedAt: "2026-10-03T09:00:00Z" }),
  note({ id: "c", title: "Ideias", content: "Poupança para férias", createdAt: "2026-10-02T09:00:00Z", updatedAt: "2026-10-04T09:00:00Z" }),
];

describe("rowToNote", () => {
  it("maps the database row to the app shape", () => {
    expect(
      rowToNote({
        id: "x",
        household_id: "h",
        owner_profile_id: "p",
        title: "T",
        content: "C",
        version: 3,
        created_at: "c",
        updated_at: "u",
      }),
    ).toEqual({ id: "x", title: "T", content: "C", version: 3, createdAt: "c", updatedAt: "u" });
  });
});

describe("filterNotes", () => {
  it("returns every note for an empty query", () => {
    expect(filterNotes(notes, "   ")).toHaveLength(3);
  });

  it("matches title or content, case- and accent-insensitively", () => {
    expect(filterNotes(notes, "HOLIDAY").map((n) => n.id)).toEqual(["b"]);
    expect(filterNotes(notes, "cafe").map((n) => n.id)).toEqual(["a"]);
    expect(filterNotes(notes, "ferias").map((n) => n.id)).toEqual(["c"]);
  });

  it("requires every word to match, in any order", () => {
    expect(filterNotes(notes, "flights lisbon").map((n) => n.id)).toEqual(["b"]);
    expect(filterNotes(notes, "lisbon milk")).toEqual([]);
  });
});

describe("sortNotes", () => {
  it("sorts by last update, newest first", () => {
    expect(sortNotes(notes, "updated").map((n) => n.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by creation date, newest first", () => {
    expect(sortNotes(notes, "created").map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate its input", () => {
    const copy = [...notes];
    sortNotes(notes, "created");
    expect(notes).toEqual(copy);
  });
});

describe("notePreview", () => {
  it("collapses whitespace and truncates long text", () => {
    expect(notePreview("  line one\n\nline   two ")).toBe("line one line two");
    expect(notePreview("abcdefghij", 5)).toBe("abcde…");
  });
});

describe("drafts", () => {
  it("treats whitespace-only drafts as blank", () => {
    expect(isBlankDraft({ title: "  ", content: "\n" })).toBe(true);
    expect(isBlankDraft({ title: "", content: "x" })).toBe(false);
  });

  it("compares title and content exactly", () => {
    expect(draftsEqual({ title: "a", content: "b" }, { title: "a", content: "b" })).toBe(true);
    expect(draftsEqual({ title: "a", content: "b" }, { title: "a", content: "b " })).toBe(false);
  });

  it("normalizes for search", () => {
    expect(normalizeForSearch("Poupança")).toBe("poupanca");
  });
});

describe("upsertNote", () => {
  it("adds a new note to the front and replaces an existing one in place", () => {
    const added = upsertNote(notes, note({ id: "d", title: "New" }));
    expect(added.map((n) => n.id)).toEqual(["d", "a", "b", "c"]);

    const replaced = upsertNote(notes, { ...notes[1], title: "Holiday plan v2", version: 2 });
    expect(replaced.map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect(replaced[1].title).toBe("Holiday plan v2");
  });

  it("handles an empty cache", () => {
    expect(upsertNote(undefined, notes[0])).toEqual([notes[0]]);
  });
});
