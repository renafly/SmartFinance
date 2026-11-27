import type { Note, NoteDraft } from "../types";
import { NoteAutosave, type NotePersistence, type NoteSaveStatus } from "./note-autosave";

/** In-memory stand-in for the notes table, with the same version semantics as the real update trigger. */
function createServer() {
  const rows = new Map<string, Note>();
  let nextId = 1;
  let clock = 0;
  const calls: { kind: "create" | "update"; draft: NoteDraft; expectedVersion?: number }[] = [];
  let gate: Promise<void> | null = null;
  let failNext = false;

  const timestamp = () => new Date(Date.UTC(2026, 9, 1, 0, 0, ++clock)).toISOString();

  const persistence: NotePersistence = {
    async create(draft) {
      calls.push({ kind: "create", draft });
      if (gate) await gate;
      if (failNext) {
        failNext = false;
        throw new Error("network");
      }
      const now = timestamp();
      const note: Note = { id: `n${nextId++}`, ...draft, version: 1, createdAt: now, updatedAt: now };
      rows.set(note.id, note);
      return note;
    },
    async update(id, expectedVersion, draft) {
      calls.push({ kind: "update", draft, expectedVersion });
      if (gate) await gate;
      if (failNext) {
        failNext = false;
        throw new Error("network");
      }
      const current = rows.get(id);
      if (!current || current.version !== expectedVersion) return null;
      const next = { ...current, ...draft, version: current.version + 1, updatedAt: timestamp() };
      rows.set(id, next);
      return next;
    },
    async fetchLatest(id) {
      return rows.get(id) ?? null;
    },
  };

  return {
    persistence,
    rows,
    calls,
    /** Holds every request until the returned function is called. */
    hold() {
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        gate = null;
        release();
      };
    },
    failNextRequest() {
      failNext = true;
    },
    /** Simulates another device saving the note. */
    editElsewhere(id: string, draft: Partial<NoteDraft>) {
      const current = rows.get(id)!;
      rows.set(id, { ...current, ...draft, version: current.version + 1, updatedAt: timestamp() });
    },
  };
}

function setup(initial: Note | null = null, server = createServer()) {
  const statuses: NoteSaveStatus[] = [];
  const saved: Note[] = [];
  const conflicts: (Note | null)[] = [];
  const autosave = new NoteAutosave({
    initial,
    persistence: server.persistence,
    delayMs: 500,
    onStatusChange: (status) => statuses.push(status),
    onSaved: (note) => saved.push(note),
    onConflict: (latest) => conflicts.push(latest),
  });
  return { autosave, server, statuses, saved, conflicts };
}

/** Lets pending promise callbacks run (fake timers don't advance microtasks by themselves). */
async function settle() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("NoteAutosave", () => {
  it("does not create a new note until it has some text", async () => {
    const { autosave, server } = setup();

    autosave.change({ title: "   ", content: "" });
    jest.advanceTimersByTime(1000);
    await autosave.flush();

    expect(server.calls).toHaveLength(0);
    expect(autosave.getStatus()).toBe("idle");
  });

  it("debounces typing into one create, then updates with the returned version", async () => {
    const { autosave, server, saved } = setup();

    autosave.change({ title: "G", content: "" });
    autosave.change({ title: "Gr", content: "" });
    autosave.change({ title: "Groceries", content: "" });
    expect(autosave.getStatus()).toBe("pending");
    jest.advanceTimersByTime(499);
    expect(server.calls).toHaveLength(0);

    jest.advanceTimersByTime(1);
    await settle();
    expect(server.calls).toEqual([{ kind: "create", draft: { title: "Groceries", content: "" } }]);
    expect(autosave.getStatus()).toBe("saved");

    autosave.change({ title: "Groceries", content: "Milk" });
    await autosave.flush();
    expect(server.calls[1]).toEqual({ kind: "update", draft: { title: "Groceries", content: "Milk" }, expectedVersion: 1 });
    expect(saved.at(-1)?.version).toBe(2);
  });

  it("never runs two saves at once and always ends with the newest text", async () => {
    const existing: Note = { id: "x", title: "T", content: "a", version: 1, createdAt: "c", updatedAt: "u" };
    const server = createServer();
    server.rows.set("x", existing);
    const { autosave } = setup(existing, server);

    const release = server.hold();
    autosave.change({ title: "T", content: "ab" });
    const first = autosave.flush();
    await settle();
    // Typing while the first save is still in flight.
    autosave.change({ title: "T", content: "abc" });
    const second = autosave.flush();
    await settle();
    expect(server.calls).toHaveLength(1);

    release();
    await first;
    await second;

    expect(server.calls.map((call) => call.draft.content)).toEqual(["ab", "abc"]);
    expect(server.calls.map((call) => call.expectedVersion)).toEqual([1, 2]);
    expect(server.rows.get("x")?.content).toBe("abc");
    expect(autosave.getStatus()).toBe("saved");
    expect(autosave.hasUnsavedChanges()).toBe(false);
  });

  it("keeps the text after a failed save and retries it", async () => {
    const { autosave, server } = setup();

    server.failNextRequest();
    autosave.change({ title: "Idea", content: "" });
    await autosave.flush();
    expect(autosave.getStatus()).toBe("error");
    expect(autosave.hasUnsavedChanges()).toBe(true);

    await autosave.retry();
    expect(autosave.getStatus()).toBe("saved");
    expect([...server.rows.values()][0].title).toBe("Idea");
  });

  it("does not overwrite a newer copy saved elsewhere; keepMine overwrites on request", async () => {
    const existing: Note = { id: "x", title: "T", content: "mine", version: 1, createdAt: "c", updatedAt: "u" };
    const server = createServer();
    server.rows.set("x", existing);
    const { autosave, conflicts } = setup(existing, server);

    server.editElsewhere("x", { content: "theirs" });
    autosave.change({ title: "T", content: "mine, edited" });
    await autosave.flush();

    expect(autosave.getStatus()).toBe("conflict");
    expect(server.rows.get("x")?.content).toBe("theirs");
    expect(conflicts[0]?.content).toBe("theirs");

    // Typing during a conflict doesn't save.
    autosave.change({ title: "T", content: "mine, edited more" });
    jest.advanceTimersByTime(1000);
    await settle();
    expect(server.rows.get("x")?.content).toBe("theirs");

    await autosave.keepMine();
    expect(server.rows.get("x")?.content).toBe("mine, edited more");
    expect(autosave.getStatus()).toBe("saved");
  });

  it("loadLatest adopts the other copy and drops local changes", async () => {
    const existing: Note = { id: "x", title: "T", content: "mine", version: 1, createdAt: "c", updatedAt: "u" };
    const server = createServer();
    server.rows.set("x", existing);
    const { autosave } = setup(existing, server);

    server.editElsewhere("x", { content: "theirs" });
    autosave.change({ title: "T", content: "mine, edited" });
    await autosave.flush();

    const latest = autosave.loadLatest();
    expect(latest?.content).toBe("theirs");
    expect(autosave.getStatus()).toBe("saved");
    expect(autosave.hasUnsavedChanges()).toBe(false);
  });

  it("can restore a note that was deleted elsewhere", async () => {
    const existing: Note = { id: "x", title: "T", content: "mine", version: 1, createdAt: "c", updatedAt: "u" };
    const server = createServer();
    server.rows.set("x", existing);
    const { autosave, conflicts } = setup(existing, server);

    server.rows.delete("x");
    autosave.change({ title: "T", content: "mine, edited" });
    await autosave.flush();
    expect(conflicts).toEqual([null]);

    await autosave.keepMine();
    const restored = [...server.rows.values()];
    expect(restored).toHaveLength(1);
    expect(restored[0].content).toBe("mine, edited");
  });

  it("cancel stops pending saves (used before deleting)", async () => {
    const { autosave, server } = setup();

    autosave.change({ title: "About to be deleted", content: "" });
    autosave.cancel();
    jest.advanceTimersByTime(1000);
    await autosave.flush();

    expect(server.calls).toHaveLength(0);
  });

  it("goes back to saved when the text is reverted before the debounce", async () => {
    const existing: Note = { id: "x", title: "T", content: "a", version: 1, createdAt: "c", updatedAt: "u" };
    const { autosave, server } = setup(existing);

    autosave.change({ title: "T", content: "ab" });
    autosave.change({ title: "T", content: "a" });
    jest.advanceTimersByTime(1000);
    await settle();

    expect(autosave.getStatus()).toBe("saved");
    expect(server.calls).toHaveLength(0);
  });
});
