"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { DocumentUpload } from "@/components/dashboard/document-upload";

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
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
      <p className="mt-1 text-sm text-gray-500">
        Upload treatment menus, FAQs, and approved content the AI will reference
        when chatting with patients.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload form */}
      <div className="mt-6">
        <DocumentUpload onUpload={handleUpload} />
      </div>

      {/* Document list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Uploaded Documents
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : documents.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 py-8 text-center">
            <p className="text-sm text-gray-500">
              No documents yet. Upload your treatment menu or pricing sheet to
              get started.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {doc.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {docTypeLabels[doc.doc_type] || doc.doc_type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.title)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
