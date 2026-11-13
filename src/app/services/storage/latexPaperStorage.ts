// Papers written in the LaTeX editor. The LaTeX text and paper details live in
// localStorage; images go to IndexedDB because localStorage is too small for them.

export interface LatexPaperRecord {
  id: string;
  /** Exam title line, e.g. "Even Semester B.E. Examinations, June 2026". */
  title: string;
  subjectName: string;
  courseCode: string;
  semester: string;
  totalMarks: number;
  /** Minutes. */
  duration: number;
  date: string;
  showHeader: boolean;
  instructions: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredImage {
  name: string;
  blob: Blob;
}

const STORAGE_KEY = "qpgen_latex_papers_v1";
const DB_NAME = "qpgen_latex_assets";
const IMAGE_STORE = "images";

function load(): LatexPaperRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function newLatexPaperId(): string {
  return `LTX-${Date.now().toString(36).toUpperCase()}`;
}

export function getLatexPapers(): LatexPaperRecord[] {
  return load();
}

export function getLatexPaperById(id: string): LatexPaperRecord | undefined {
  return load().find((paper) => paper.id === id);
}

/** Creates or replaces a paper. Throws if the browser refuses the write. */
export function saveLatexPaper(paper: Omit<LatexPaperRecord, "createdAt" | "updatedAt">): LatexPaperRecord {
  const all = load();
  const now = new Date().toISOString();
  const index = all.findIndex((existing) => existing.id === paper.id);
  const record: LatexPaperRecord = {
    ...paper,
    createdAt: index >= 0 ? all[index].createdAt : now,
    updatedAt: now,
  };
  if (index >= 0) all[index] = record;
  else all.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return record;
}

export async function deleteLatexPaper(id: string): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(load().filter((paper) => paper.id !== id)));
  await deleteImagesForPaper(id);
}

// ---------------------------------------------------------------------------
// Images (IndexedDB). Keys are [paperId, fileName].
// ---------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, mode);
      const request = run(tx.objectStore(IMAGE_STORE));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function paperRange(paperId: string): IDBKeyRange {
  return IDBKeyRange.bound([paperId, ""], [paperId, "￿"]);
}

export async function putImage(paperId: string, name: string, blob: Blob): Promise<void> {
  await withStore("readwrite", (store) => store.put(blob, [paperId, name]));
}

export async function deleteImage(paperId: string, name: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete([paperId, name]));
}

export async function listImages(paperId: string): Promise<StoredImage[]> {
  const db = await openDb();
  try {
    return await new Promise<StoredImage[]>((resolve, reject) => {
      const images: StoredImage[] = [];
      const tx = db.transaction(IMAGE_STORE, "readonly");
      const cursorRequest = tx.objectStore(IMAGE_STORE).openCursor(paperRange(paperId));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        images.push({ name: (cursor.key as [string, string])[1], blob: cursor.value as Blob });
        cursor.continue();
      };
      tx.oncomplete = () => resolve(images);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteImagesForPaper(paperId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(paperRange(paperId)));
}
