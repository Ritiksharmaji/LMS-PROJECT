"use client";

import { api, ApiError } from "./api";
import type { FilePurpose, FileView, UploadTicket } from "./types";

/**
 * Uploads a file straight to storage: ask the API for a presigned target, PUT the bytes there, then confirm.
 * `onProgress` receives 0–100.
 */
export async function uploadFile(file: File, purpose: FilePurpose, courseId?: string, onProgress?: (pct: number) => void): Promise<FileView> {
  const ticket = await api.post<UploadTicket>("/me/uploads", {
    purpose,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    courseId,
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method, ticket.uploadUrl);
    for (const [k, v] of Object.entries(ticket.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError({ status: xhr.status, code: "upload_failed", detail: "The upload failed. Try again." })));
    xhr.onerror = () => reject(new ApiError({ status: 0, code: "upload_failed", detail: "The upload failed. Check your connection." }));
    xhr.send(file);
  });
  return api.post<FileView>(`/me/uploads/${ticket.fileId}/complete`);
}
