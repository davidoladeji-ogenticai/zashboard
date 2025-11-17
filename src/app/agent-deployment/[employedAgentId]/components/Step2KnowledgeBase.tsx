'use client'

import { useState, useRef } from 'react'

interface Step2KnowledgeBaseProps {
  deploymentId: string
  organizationId: string
  onComplete: (data: { documentCount: number; sources: string[] }) => void
  onBack: () => void
}

export default function Step2KnowledgeBase({
  deploymentId,
  organizationId,
  onComplete,
  onBack
}: Step2KnowledgeBaseProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('deploymentId', deploymentId)
      formData.append('organizationId', organizationId)

      Array.from(files).forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/agents/knowledge/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setUploadedFiles((prev) => [...prev, ...result.uploadedFiles])
      setUploadProgress(100)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('[Step2KnowledgeBase] Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  const handleContinue = () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one document to continue')
      return
    }

    onComplete({
      documentCount: uploadedFiles.length,
      sources: uploadedFiles
    })
  }

  const handleSkip = () => {
    onComplete({
      documentCount: 0,
      sources: []
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Build Your Knowledge Base
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Upload documents that the agent will use to answer questions. Supported formats: PDF, DOCX, TXT, MD, CSV.
        </p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.csv"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          <svg
            className="w-12 h-12 text-slate-400 dark:text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div>
            <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Click to upload
            </span>
            <span className="text-slate-600 dark:text-slate-400"> or drag and drop</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            PDF, DOCX, TXT, MD, CSV up to 10MB each
          </p>
        </label>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <svg
              className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Uploading and processing documents...
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {uploadedFiles.length} {uploadedFiles.length === 1 ? 'document' : 'documents'} uploaded
          </h3>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <li
                key={index}
                className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{file}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Integration Options */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Coming Soon: Connect External Sources
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled
            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg opacity-50 cursor-not-allowed"
          >
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
              <span className="text-xs font-bold">C</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900 dark:text-white">Confluence</div>
              <div className="text-xs text-slate-500">Coming soon</div>
            </div>
          </button>
          <button
            disabled
            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg opacity-50 cursor-not-allowed"
          >
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
              <span className="text-xs font-bold">N</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900 dark:text-white">Notion</div>
              <div className="text-xs text-slate-500">Coming soon</div>
            </div>
          </button>
          <button
            disabled
            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg opacity-50 cursor-not-allowed"
          >
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
              <span className="text-xs font-bold">G</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900 dark:text-white">Google Drive</div>
              <div className="text-xs text-slate-500">Coming soon</div>
            </div>
          </button>
          <button
            disabled
            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg opacity-50 cursor-not-allowed"
          >
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
              <span className="text-xs font-bold">D</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900 dark:text-white">Dropbox</div>
              <div className="text-xs text-slate-500">Coming soon</div>
            </div>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Error</h4>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkip}
            className="px-6 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Skip for Now
          </button>
          <button
            onClick={handleContinue}
            disabled={isUploading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
