"use client";

import { useRef, useState } from "react";

interface DocumentUploadProps {
  onUpload: (file: File, title: string, docType: string) => Promise<void>;
}

const docTypes = [
  { value: "treatment_menu", label: "Treatment Menu" },
  { value: "pricing", label: "Pricing Sheet" },
  { value: "faq", label: "FAQ" },
  { value: "sop", label: "SOP / Protocol" },
];

export function DocumentUpload({ onUpload }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("faq");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !title.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile, title.trim(), docType);
      // Reset form
      setTitle("");
      setSelectedFile(null);
      setDocType("faq");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900">Upload Document</h3>
      <p className="mt-1 text-xs text-gray-500">
        Upload treatment menus, pricing sheets, FAQs, or SOPs for the AI to reference.
      </p>

      <div className="mt-3 space-y-3">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title (e.g., Treatment Menu 2025)"
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        {/* Doc type */}
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {docTypes.map((dt) => (
            <option key={dt.value} value={dt.value}>
              {dt.label}
            </option>
          ))}
        </select>

        {/* File input */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            required
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedFile || !title.trim() || isUploading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? "Uploading..." : "Upload & Process"}
        </button>
      </div>
    </form>
  );
}
