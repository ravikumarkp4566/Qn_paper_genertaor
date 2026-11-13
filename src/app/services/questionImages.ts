// Images attached to questions. They are stored on the server per question and
// fetched with the user's sign-in, so the browser keeps object URLs for display.

import { useEffect, useState } from "react";
import { api, apiBlob } from "./api";

const path = (questionId: string, name: string) =>
  `/questions/${encodeURIComponent(questionId)}/images/${encodeURIComponent(name)}`;

const urlCache = new Map<string, Promise<string>>();
const cacheKey = (questionId: string, name: string) => `${questionId}/${name}`;

export function questionImageBlob(questionId: string, name: string): Promise<Blob> {
  return apiBlob(path(questionId, name));
}

function questionImageUrl(questionId: string, name: string): Promise<string> {
  const key = cacheKey(questionId, name);
  let url = urlCache.get(key);
  if (!url) {
    url = questionImageBlob(questionId, name).then((blob) => URL.createObjectURL(blob));
    // A failed download should be retried next time, not remembered.
    url.catch(() => urlCache.delete(key));
    urlCache.set(key, url);
  }
  return url;
}

export async function putQuestionImage(questionId: string, name: string, blob: Blob): Promise<void> {
  await api(path(questionId, name), { method: "PUT", file: blob });
  urlCache.set(cacheKey(questionId, name), Promise.resolve(URL.createObjectURL(blob)));
}

export async function deleteQuestionImage(questionId: string, name: string): Promise<void> {
  await api(path(questionId, name), { method: "DELETE" });
  urlCache.delete(cacheKey(questionId, name));
}

/** Display URLs for a question's images, by file name. Loads them on demand. */
export function useQuestionImageUrls(questionId: string | undefined, names: string[] | undefined): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const list = (names ?? []).join("|");

  useEffect(() => {
    if (!questionId || !list) {
      setUrls({});
      return;
    }
    let cancelled = false;
    Promise.all(
      list.split("|").map(async (name) => [name, await questionImageUrl(questionId, name).catch(() => "")] as const)
    ).then((entries) => {
      if (!cancelled) setUrls(Object.fromEntries(entries.filter(([, url]) => url)));
    });
    return () => {
      cancelled = true;
    };
  }, [questionId, list]);

  return urls;
}
