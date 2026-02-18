"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DocumentUpload } from "@/components/dashboard/document-upload";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, FileText, File, FileCode, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KnowledgeDocument {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  doc_type: string;
  created_at: string;
  updated_at: string;
}

const docTypeLabels: Record<string, string> = {
  treatment_menu: "Treatment Menu",
  pricing: "Pricing",
  faq: "FAQ",
  sop: "SOP",
};

const docTypeVariant: Record<string, "info" | "accent" | "success" | "warning"> = {
  treatment_menu: "accent",
  pricing: "success",
  faq: "info",
  sop: "warning",
};

const docTypeIcons: Record<string, LucideIcon> = {
  treatment_menu: FileText,
  pricing: File,
  faq: FileText,
  sop: FileCode,
};

export default function KnowledgeBasePage() {
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDocuments = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api.get<KnowledgeDocument[]>("/knowledge-base", {
        token: token || undefined,
      });
      setDocuments(data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError("Failed to load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (file: File, title: string, docType: string) => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("doc_type", docType);

    await api.upload("/knowledge-base", formData, {
      token: token || undefined,
    });

    await fetchDocuments();
  };

  const handleDelete = async (title: string) => {
    if (!confirm(`Delete "${title}" and all its chunks?`)) return;

    try {
      const token = await getToken();
      await api.delete(`/knowledge-base/${encodeURIComponent(title)}`, {
        token: token || undefined,
      });
      setDocuments((prev) => prev.filter((d) => d.title !== title));
    } catch (err) {
      console.error("Failed to delete document:", err);
      setError("Failed to delete document. Please try again.");
      setTimeout(() => setError(""), 5000);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Knowledge Base"
        subtitle="Upload treatment menus, FAQs, and approved content the AI will reference when chatting with patients."
      />

      {error && (
        <Card className="mb-4 border-spa-danger/30 bg-spa-danger/5">
          <p className="text-sm text-spa-danger">{error}</p>
        </Card>
      )}

      <DocumentUpload onUpload={handleUpload} />

      <div className="mt-8">
        <h2
          className="text-lg font-semibold mb-4"
          style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--text)" }}
        >
          Uploaded Documents
        </h2>

        {loading ? (
          <PageLoader />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No documents yet"
            description="Upload your treatment menu or pricing sheet to get started."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const DocIcon = docTypeIcons[doc.doc_type] || FileText;
              return (
                <Card key={doc.id} className="p-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "var(--surface-secondary)" }}
                      >
                        <DocIcon className="h-5 w-5 text-spa-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold line-clamp-1" style={{ color: "var(--text)" }}>
                          {doc.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge variant={docTypeVariant[doc.doc_type] || "muted"}>
                            {docTypeLabels[doc.doc_type] || doc.doc_type}
                          </StatusBadge>
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.title)}
                      className="rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-spa-danger/10"
                    >
                      <Trash2 className="h-4 w-4 text-spa-danger" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
