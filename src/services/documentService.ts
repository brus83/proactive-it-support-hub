import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/utils/sanitizer";

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  is_public: boolean;
  download_count: number;
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'error';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  uploader?: {
    full_name: string;
  };
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  attachmentId?: string;
}

class DocumentService {
  private readonly STORAGE_BUCKET = 'ticket-attachments';
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ];

  // Helper to transform Supabase data to TicketAttachment interface
  private transformToTicketAttachment(item: any): TicketAttachment {
    return {
      id: item.id,
      ticket_id: item.ticket_id,
      file_name: item.file_name,
      file_path: item.file_path,
      file_size: item.file_size,
      mime_type: item.mime_type,
      uploaded_by: item.uploaded_by || '',
      is_public: item.is_public,
      download_count: item.download_count,
      virus_scan_status: item.virus_scan_status as 'pending' | 'clean' | 'infected' | 'error',
      metadata: typeof item.metadata === 'object' ? item.metadata as Record<string, any> : {},
      created_at: item.created_at,
      updated_at: item.updated_at,
      uploader: item.uploader && typeof item.uploader === 'object' && item.uploader !== null
        ? { full_name: (item.uploader as any)?.full_name || 'Unknown' } 
        : undefined
    };
  }

  // Initialize storage bucket if it doesn't exist
  async initializeStorage(): Promise<void> {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.STORAGE_BUCKET);
      
      if (!bucketExists) {
        await supabase.storage.createBucket(this.STORAGE_BUCKET, {
          public: false,
          allowedMimeTypes: this.ALLOWED_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        });
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  // Upload multiple files with progress tracking
  async uploadFiles(
    ticketId: string, 
    files: File[], 
    onProgress?: (progress: UploadProgress[]) => void
  ): Promise<TicketAttachment[]> {
    await this.initializeStorage();
    
    const uploadPromises = files.map(async (file, index) => {
      return this.uploadSingleFile(ticketId, file, (progress) => {
        if (onProgress) {
          const currentProgress: UploadProgress[] = files.map((f, i) => ({
            file: f,
            progress: i === index ? progress : 0,
            status: i === index ? 'uploading' : 'uploading'
          }));
          onProgress(currentProgress);
        }
      });
    });

    return Promise.all(uploadPromises);
  }

  // Upload single file
  private async uploadSingleFile(
    ticketId: string, 
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<TicketAttachment> {
    // Validate file
    this.validateFile(file);

    const sanitizedFileName = sanitizeText(file.name);
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    const filePath = `${ticketId}/${uniqueFileName}`;

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Simulate virus scan (in real implementation, integrate with antivirus service)
      const virusScanStatus = await this.simulateVirusScan(file);

      // Save metadata to database
      const { data: attachment, error: dbError } = await supabase
        .from('ticket_attachments')
        .insert({
          ticket_id: ticketId,
          file_name: sanitizedFileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          virus_scan_status: virusScanStatus,
          metadata: {
            original_name: file.name,
            upload_timestamp: new Date().toISOString()
          }
        })
        .select(`
          *,
          uploader:profiles!ticket_attachments_uploaded_by_fkey (full_name)
        `)
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from(this.STORAGE_BUCKET).remove([filePath]);
        throw dbError;
      }

      if (onProgress) onProgress(100);

      return {
        id: attachment.id,
        ticket_id: attachment.ticket_id,
        file_name: attachment.file_name,
        file_path: attachment.file_path,
        file_size: attachment.file_size,
        mime_type: attachment.mime_type,
        uploaded_by: attachment.uploaded_by || '',
        is_public: attachment.is_public,
        download_count: attachment.download_count,
        virus_scan_status: attachment.virus_scan_status as 'pending' | 'clean' | 'infected' | 'error',
        metadata: typeof attachment.metadata === 'object' ? attachment.metadata as Record<string, any> : {},
        created_at: attachment.created_at,
        updated_at: attachment.updated_at,
        uploader: attachment.uploader && typeof attachment.uploader === 'object' && attachment.uploader !== null
          ? { full_name: (attachment.uploader as any)?.full_name || 'Unknown' } 
          : undefined
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Errore nell'upload di ${file.name}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  // Validate file before upload
  private validateFile(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`Il file ${file.name} è troppo grande. Dimensione massima: 50MB`);
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Tipo di file non supportato: ${file.type}. Tipi consentiti: immagini, PDF, Excel, Word, testo`);
    }

    // Additional security check for filename
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      throw new Error('Nome file non valido');
    }
  }

  // Simulate virus scan (replace with real antivirus integration)
  private async simulateVirusScan(file: File): Promise<'clean' | 'infected' | 'error'> {
    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple heuristics (in production, use real antivirus API)
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
    const hasSuspiciousExtension = suspiciousExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (hasSuspiciousExtension) {
      return 'infected';
    }

    // Random 1% chance of scan error for testing
    if (Math.random() < 0.01) {
      return 'error';
    }

    return 'clean';
  }

  // Get attachments for a ticket
  async getTicketAttachments(ticketId: string): Promise<TicketAttachment[]> {
    try {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select(`
        *,
        uploader:profiles!ticket_attachments_uploaded_by_fkey (full_name)
      `)
      .eq('ticket_id', ticketId)
      .eq('virus_scan_status', 'clean')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => this.transformToTicketAttachment(item));
    } catch (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }
  }

  // Get download URL for attachment
  async getDownloadUrl(attachmentId: string): Promise<string> {
    // First check permissions and get file path
    const { data: attachment, error } = await supabase
      .from('ticket_attachments')
      .select('file_path, ticket_id')
      .eq('id', attachmentId)
      .single();

    if (error) throw error;

    // Increment download count
    await supabase.rpc('increment_download_count', { attachment_id: attachmentId });

    // Get signed URL for download
    const { data: urlData, error: urlError } = await supabase.storage
      .from(this.STORAGE_BUCKET)
      .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

    if (urlError) throw urlError;

    return urlData.signedUrl;
  }

  // Delete attachment
  async deleteAttachment(attachmentId: string): Promise<void> {
    // Get file path first
    const { data: attachment, error: fetchError } = await supabase
      .from('ticket_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(this.STORAGE_BUCKET)
      .remove([attachment.file_path]);

    if (storageError) console.error('Storage deletion error:', storageError);

    // Delete from database
    const { error: dbError } = await supabase
      .from('ticket_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) throw dbError;
  }

  // Get file category for icon display
  getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'other';
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get all attachments for user (admin function)
  async getAllAttachments(): Promise<TicketAttachment[]> {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select(`
        *,
        uploader:profiles!ticket_attachments_uploaded_by_fkey (full_name),
        tickets (title, status)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => this.transformToTicketAttachment(item));
  }

  // Get storage usage statistics
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    recentUploads: number;
  }> {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('file_size, mime_type, created_at');

    if (error) throw error;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalFiles: data?.length || 0,
      totalSize: data?.reduce((sum, file) => sum + file.file_size, 0) || 0,
      filesByType: {} as Record<string, number>,
      recentUploads: data?.filter(file => new Date(file.created_at) > oneWeekAgo).length || 0
    };

    // Count files by category
    data?.forEach(file => {
      const category = this.getFileCategory(file.mime_type);
      stats.filesByType[category] = (stats.filesByType[category] || 0) + 1;
    });

    return stats;
  }
}

export const documentService = new DocumentService();