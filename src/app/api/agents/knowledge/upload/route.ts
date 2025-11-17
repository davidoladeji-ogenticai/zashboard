import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { query as dbQuery } from '@/lib/database'

// Dynamic imports for CommonJS modules
const getPdfParse = () => import('pdf-parse')
const getMammoth = () => import('mammoth')

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const deploymentId = formData.get('deploymentId') as string
    const organizationId = formData.get('organizationId') as string
    const files = formData.getAll('files') as File[]

    if (!deploymentId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing deploymentId or organizationId' },
        { status: 400 }
      )
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    console.log(`[Knowledge Upload] Uploading ${files.length} files for deployment: ${deploymentId}`)

    // Verify user has access to deployment
    const deploymentResult = await dbQuery(
      `SELECT ad.*
       FROM agent_deployments ad
       JOIN organization_memberships om ON ad.organization_id = om.organization_id
       WHERE ad.id = $1 AND om.user_id = $2
       LIMIT 1`,
      [deploymentId, userId]
    )

    if (deploymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Deployment not found or access denied' },
        { status: 404 }
      )
    }

    const uploadedFiles: string[] = []
    const uploadedDocuments: any[] = []
    const maxFileSize = 10 * 1024 * 1024 // 10MB

    for (const file of files) {
      // Validate file size
      if (file.size > maxFileSize) {
        console.warn(`[Knowledge Upload] File too large: ${file.name} (${file.size} bytes)`)
        continue
      }

      // Validate file extension (more reliable than MIME type)
      const fileName = file.name.toLowerCase()
      const allowedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv']
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))

      if (!hasValidExtension) {
        console.warn(`[Knowledge Upload] Unsupported file type: ${file.name}`)
        continue
      }

      try {
        // Read file content
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        let content = ''

        // Extract text based on file type
        if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv')) {
          content = buffer.toString('utf-8')
        } else if (fileName.endsWith('.pdf')) {
          try {
            const pdfParse = (await getPdfParse()).default
            const pdfData = await pdfParse(buffer)
            content = pdfData.text
            console.log(`[Knowledge Upload] Extracted ${pdfData.text.length} chars from PDF: ${file.name}`)
          } catch (pdfError) {
            console.error(`[Knowledge Upload] PDF extraction failed for ${file.name}:`, pdfError)
            content = `Failed to extract text from PDF: ${file.name}`
          }
        } else if (fileName.endsWith('.docx')) {
          try {
            const mammoth = (await getMammoth()).default
            const result = await mammoth.extractRawText({ buffer })
            content = result.value
            console.log(`[Knowledge Upload] Extracted ${result.value.length} chars from DOCX: ${file.name}`)
          } catch (docxError) {
            console.error(`[Knowledge Upload] DOCX extraction failed for ${file.name}:`, docxError)
            content = `Failed to extract text from DOCX: ${file.name}`
          }
        }

        // For now, store the full document as one entry
        // In production, you would:
        // 1. Extract text from PDF/DOCX
        // 2. Chunk the content
        // 3. Generate embeddings
        // 4. Store chunks with embeddings

        const documentId = `kb_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const metadata = {
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString()
        }

        const result = await dbQuery(
          `INSERT INTO agent_knowledge_base (
            id, agent_deployment_id, source_type, title, content,
            metadata, created_at, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
          RETURNING id, source_type, title, content, metadata, created_at, created_by`,
          [
            documentId,
            deploymentId,
            'upload',
            file.name,
            content.substring(0, 200000), // Limit to 200k chars (~50k tokens)
            JSON.stringify(metadata),
            userId
          ]
        )

        uploadedFiles.push(file.name)
        uploadedDocuments.push(result.rows[0])
        console.log(`[Knowledge Upload] Uploaded: ${file.name}`)
      } catch (error) {
        console.error(`[Knowledge Upload] Error processing ${file.name}:`, error)
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files were successfully uploaded' },
        { status: 400 }
      )
    }

    console.log(`[Knowledge Upload] Successfully uploaded ${uploadedFiles.length} files`)

    return NextResponse.json({
      success: true,
      uploadedFiles,
      documents: uploadedDocuments,
      count: uploadedFiles.length
    })
  } catch (error) {
    console.error('[Knowledge Upload] Error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}
