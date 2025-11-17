'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Document {
  id: string
  source_type: string
  title: string
  content?: string
  metadata: any
  created_at: string
  created_by: string
}

interface NotionProgress {
  current: number
  total: number
  currentPage: string
}

interface NotionStatus {
  connected: boolean
  workspace_name?: string
  sync_status?: string
  last_sync_at?: string
  documents_count?: number
  progress?: NotionProgress | null
}

interface KnowledgeManagerProps {
  deploymentId: string
  organizationId: string
  documents: Document[]
}

export default function KnowledgeManager({ deploymentId, organizationId, documents: initialDocuments }: KnowledgeManagerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [notionStatus, setNotionStatus] = useState<NotionStatus>({ connected: false })
  const [isSyncing, setIsSyncing] = useState(false)

  // Check Notion connection status on mount
  useEffect(() => {
    fetchNotionStatus()

    // Show success message if redirected from Notion OAuth
    if (searchParams?.get('notion_connected') === 'true') {
      setSuccess('Notion workspace connected successfully! You can now sync your pages.')
      setTimeout(() => setSuccess(null), 5000)
    }
  }, [searchParams])

  // Poll for sync progress when syncing
  useEffect(() => {
    if (notionStatus.sync_status !== 'syncing') return

    const interval = setInterval(() => {
      fetchNotionStatus()
    }, 1000) // Poll every second

    return () => clearInterval(interval)
  }, [notionStatus.sync_status])

  const fetchNotionStatus = async () => {
    try {
      const response = await fetch(`/api/agents/notion/sync?deploymentId=${deploymentId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotionStatus(data)

          // If sync just completed, show success message and refresh
          if (data.sync_status === 'completed' && isSyncing) {
            setIsSyncing(false)
            setSuccess(`Successfully synced ${data.documents_count} Notion pages!`)
            setTimeout(() => setSuccess(null), 5000)
            router.refresh()
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch Notion status:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setError(null)
    setSuccess(null)
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
      setUploadProgress(100)

      const fileCount = result.count || result.uploadedFiles?.length || 0
      setSuccess(`Successfully uploaded ${fileCount} ${fileCount === 1 ? 'document' : 'documents'}!`)

      // Add new documents to the list
      if (result.documents && result.documents.length > 0) {
        setDocuments([...result.documents, ...documents])
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('[Knowledge Upload] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload files')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/agents/knowledge/${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      // Remove from list
      setDocuments(documents.filter(doc => doc.id !== documentId))
    } catch (err) {
      console.error('[Knowledge Delete] Error:', err)
      alert('Failed to delete document')
    }
  }

  const handleNotionConnect = () => {
    // Get client ID from env - it should be prefixed with NEXT_PUBLIC_ to be available in browser
    const notionClientId = process.env.NEXT_PUBLIC_NOTION_CLIENT_ID
    if (!notionClientId) {
      setError('Notion integration not configured. Please add NEXT_PUBLIC_NOTION_CLIENT_ID to your environment variables.')
      return
    }

    const redirectUri = `${window.location.origin}/api/agents/notion/oauth`
    const state = deploymentId // Pass deployment ID in state

    console.log('[Notion Connect] Redirecting to Notion OAuth with:', { redirectUri, clientId: notionClientId })

    // Redirect to Notion OAuth
    window.location.href = `https://api.notion.com/v1/oauth/authorize?client_id=${notionClientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  }

  const handleNotionSync = async () => {
    setIsSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/agents/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync Notion')
      }

      // Sync started, polling will handle updates
      console.log('[Notion Sync] Sync started, polling for progress...')
    } catch (err) {
      console.error('[Notion Sync] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sync Notion')
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Upload Documents
        </h2>

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
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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

        {/* Success */}
        {success && (
          <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Integration Options */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Connect External Sources
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Sync knowledge directly from your favorite tools
        </p>

        {/* Notion Integration */}
        {notionStatus.connected ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-green-700 dark:text-green-300">N</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                      {notionStatus.workspace_name || 'Notion Workspace'}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      Connected
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-green-700 dark:text-green-300">
                    {notionStatus.documents_count || 0} documents synced
                    {notionStatus.last_sync_at && (
                      <> · Last sync: {new Date(notionStatus.last_sync_at).toLocaleString()}</>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {notionStatus.sync_status === 'syncing' && notionStatus.progress && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-green-800 dark:text-green-200">
                          {notionStatus.progress.current > 0
                            ? `${notionStatus.progress.current} of ${notionStatus.progress.total} pages`
                            : 'Starting...'}
                        </span>
                        <span className="text-xs text-green-700 dark:text-green-300">
                          {notionStatus.progress.total > 0
                            ? `${Math.round((notionStatus.progress.current / notionStatus.progress.total) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: notionStatus.progress.total > 0
                              ? `${(notionStatus.progress.current / notionStatus.progress.total) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-green-700 dark:text-green-300 truncate">
                        {notionStatus.progress.currentPage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleNotionSync}
                disabled={isSyncing || notionStatus.sync_status === 'syncing'}
                className="ml-3 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSyncing || notionStatus.sync_status === 'syncing' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Syncing...
                  </span>
                ) : 'Sync Now'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            disabled
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg opacity-50 cursor-not-allowed"
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
            onClick={notionStatus.connected ? undefined : handleNotionConnect}
            disabled={notionStatus.connected}
            className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
              notionStatus.connected
                ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer'
            }`}
          >
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
              <span className="text-xs font-bold">N</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900 dark:text-white">Notion</div>
              <div className="text-xs text-slate-500">
                {notionStatus.connected ? 'Connected' : 'Click to connect'}
              </div>
            </div>
          </button>
          <button
            disabled
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg opacity-50 cursor-not-allowed"
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
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg opacity-50 cursor-not-allowed"
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

      {/* Documents List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Uploaded Documents ({documents.length})
          </h2>
        </div>

        {documents.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {documents.map((doc) => {
              const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata
              return (
                <div key={doc.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {doc.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                          <span className="capitalize">{doc.source_type}</span>
                          {metadata?.fileSize && (
                            <span>{(metadata.fileSize / 1024).toFixed(1)} KB</span>
                          )}
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewDocument(doc)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Preview document"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No documents</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
              Upload documents to build your knowledge base
            </p>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="flex justify-start">
        <button
          onClick={() => router.push(`/organizations/${organizationId}/agents/${deploymentId}`)}
          className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreviewDocument(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {previewDocument.title}
                </h3>
                <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                  <span className="capitalize">{previewDocument.source_type}</span>
                  <span>{new Date(previewDocument.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewDocument(null)}
                className="ml-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                  {previewDocument.content || 'No content available'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPreviewDocument(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
