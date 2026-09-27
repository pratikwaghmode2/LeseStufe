import React, { useState } from 'react';
import { X, Upload, BookOpen, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, Book } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onSelectBook: (id: number) => void;
  onRefreshBooks: () => Promise<void> | void;
}

export const BookUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  books,
  onSelectBook,
  onRefreshBooks
}) => {
  const [tab, setTab] = useState<'upload' | 'library' | 'paste'>('upload');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [level, setLevel] = useState('A2');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setSelectedFile(f);
    setError(null);
    if (f) {
      const cleanName = f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      if (!title.trim()) {
        setTitle(cleanName);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    const finalTitle = title.trim() || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : "German Document");
    formData.append('title', finalTitle);
    formData.append('author', author.trim() || 'Unknown');
    formData.append('level', level);

    if (tab === 'upload') {
      if (!selectedFile) {
        setError("Please choose a PDF or TXT file to upload.");
        return;
      }
      formData.append('file', selectedFile);
    } else if (tab === 'paste') {
      if (!rawText.trim()) {
        setError("Please enter or paste German text into the box.");
        return;
      }
      formData.append('raw_text', rawText.trim());
    } else {
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadBook(formData);
      setSuccess(`"${res.title || finalTitle}" added successfully! Loading reader...`);
      await onRefreshBooks();
      onSelectBook(res.id);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document. Please check the file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 text-left animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Book or Text</h2>
              <p className="text-xs text-slate-500">Upload your German PDF/TXT or pick from graded library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
          <button
            onClick={() => { setTab('upload'); setError(null); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              tab === 'upload' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            Upload PDF / TXT
          </button>
          <button
            onClick={() => { setTab('paste'); setError(null); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              tab === 'paste' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            Paste Text
          </button>
          <button
            onClick={() => { setTab('library'); setError(null); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              tab === 'library' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            Sample Books ({books.length})
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Notice: </span>
              {error}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab 1: Library */}
        {tab === 'library' && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {books.map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  onSelectBook(b.id);
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{b.title}</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {b.level}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">by {b.author}</div>
                </div>
                <span className="text-xs text-amber-600 font-semibold">Open &rarr;</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2 & 3: Upload Form */}
        {(tab === 'upload' || tab === 'paste') && (
          <form onSubmit={handleUpload} className="space-y-3">
            {tab === 'upload' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Choose German PDF or TXT file *
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 p-2 rounded-xl"
                />
                {selectedFile && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paste German Text / Article *
                </label>
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={(e) => { setRawText(e.target.value); setError(null); }}
                  placeholder="Paste German story, article, or chapter here..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-hidden resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Book Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-detected from file name if left blank"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Author (Optional)</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Unknown"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target CEFR Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-hidden"
                >
                  {['A1', 'A2', 'B1', 'B2', 'C1'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer mt-2 flex items-center justify-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Extracting Text & Tagging CEFR Levels...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Add Book to Reader</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
