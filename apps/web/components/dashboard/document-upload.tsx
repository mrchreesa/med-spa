"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, FileText } from "lucide-react";

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(pdf|txt|md)$/.test(file.name)) {
      setSelectedFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !title.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile, title.trim(), docType);
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
    <Card>
      <form onSubmit={handleSubmit}>
        <h3
          className="text-base font-semibold mb-1"
          style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--text)" }}
        >
          Upload Document
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Upload treatment menus, pricing sheets, FAQs, or SOPs for the AI to reference.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Document Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Treatment Menu 2025"
              required
            />
            <Select
              label="Document Type"
              options={docTypes}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            />
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors"
            style={{
              borderColor: isDragging
                ? "var(--color-spa-accent)"
                : "var(--border)",
              backgroundColor: isDragging
                ? "var(--color-spa-accent)"
                : "var(--surface-secondary)",
              ...(isDragging ? { opacity: 0.15 } : {}),
            }}
          >
            {selectedFile ? (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-spa-primary" />
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  {selectedFile.name}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mb-2" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Drop file here or click to browse
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  PDF, TXT, or Markdown files
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
              required={!selectedFile}
            />
          </div>

          {error && (
            <p className="text-xs text-spa-danger">{error}</p>
          )}

          <Button
            type="submit"
            disabled={!selectedFile || !title.trim() || isUploading}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload & Process"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
