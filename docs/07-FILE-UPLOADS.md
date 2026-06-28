# File Uploads Design

## Overview

Using Supabase Storage for storing investigation images (X-rays, lab reports, etc.).

---

## Storage Structure

```
clinic-files/
├── {clinic_id}/
│   └── patients/
│       └── {patient_id}/
│           └── investigations/
│               └── {investigation_id}/
│                   ├── xray_001.jpg
│                   ├── lab_report.pdf
│                   └── ultrasound.png
```

---

## Supabase Storage Setup

### 1. Create Bucket

In Supabase Dashboard → Storage → Create Bucket:

| Setting            | Value                        |
| ------------------ | ---------------------------- |
| Name               | `clinic-files`               |
| Public             | **No** (private)             |
| File size limit    | 10MB                         |
| Allowed MIME types | `image/*`, `application/pdf` |

### 2. RLS Policies

```sql
-- Allow authenticated users to upload to their clinic's folder
CREATE POLICY "Clinic members can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clinic-files' AND
  (storage.foldername(name))[1] = (
    SELECT clinic_id FROM public.users WHERE id = auth.uid()
  )
);

-- Allow authenticated users to read from their clinic
CREATE POLICY "Clinic members can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'clinic-files' AND
  (storage.foldername(name))[1] = (
    SELECT clinic_id FROM public.users WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete their clinic's files
CREATE POLICY "Clinic members can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'clinic-files' AND
  (storage.foldername(name))[1] = (
    SELECT clinic_id FROM public.users WHERE id = auth.uid()
  )
);
```

---

## Upload Implementation

### Upload Hook

```typescript
// hooks/useFileUpload.ts
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UploadOptions {
  clinicId: string;
  patientId: string;
  investigationId: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const supabase = createClient();

  const uploadFile = async (file: File, options: UploadOptions) => {
    const { clinicId, patientId, investigationId } = options;

    setUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
      const filePath = `${clinicId}/patients/${patientId}/investigations/${investigationId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("clinic-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL (signed URL for private bucket)
      const { data: urlData } = await supabase.storage
        .from("clinic-files")
        .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year

      return {
        path: data.path,
        url: urlData?.signedUrl,
        fileName: file.name,
      };
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  const deleteFile = async (path: string) => {
    const { error } = await supabase.storage
      .from("clinic-files")
      .remove([path]);

    if (error) throw error;
  };

  return { uploadFile, deleteFile, uploading, progress };
}
```

### Upload Component

```typescript
// components/uploads/FileUploader.tsx
'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useFileUpload } from '@/hooks/useFileUpload'

interface FileUploaderProps {
  clinicId: string
  patientId: string
  investigationId: string
  onUploadComplete: (files: UploadedFile[]) => void
}

export function FileUploader({
  clinicId,
  patientId,
  investigationId,
  onUploadComplete
}: FileUploaderProps) {
  const { uploadFile, uploading, progress } = useFileUpload()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFiles = []

    for (const file of acceptedFiles) {
      const result = await uploadFile(file, {
        clinicId,
        patientId,
        investigationId
      })
      uploadedFiles.push(result)
    }

    onUploadComplete(uploadedFiles)
  }, [clinicId, patientId, investigationId, uploadFile, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
        ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}
      `}
    >
      <input {...getInputProps()} />

      {uploading ? (
        <div>
          <p>Uploading... {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : isDragActive ? (
        <p>Drop files here...</p>
      ) : (
        <div>
          <p>Drag & drop files here, or click to select</p>
          <p className="text-sm text-gray-500 mt-1">
            Images and PDFs up to 10MB
          </p>
        </div>
      )}
    </div>
  )
}
```

---

## Image Display

### Signed URL Component

```typescript
// components/uploads/SecureImage.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface SecureImageProps {
  path: string
  alt: string
  width: number
  height: number
  className?: string
}

export function SecureImage({ path, alt, width, height, className }: SecureImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getSignedUrl() {
      const { data } = await supabase.storage
        .from('clinic-files')
        .createSignedUrl(path, 60 * 60) // 1 hour

      setUrl(data?.signedUrl ?? null)
      setLoading(false)
    }

    getSignedUrl()
  }, [path])

  if (loading) {
    return <div className="animate-pulse bg-gray-200" style={{ width, height }} />
  }

  if (!url) {
    return <div className="bg-gray-100 flex items-center justify-center" style={{ width, height }}>
      Image not found
    </div>
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized // Required for external URLs
    />
  )
}
```

### Image Gallery

```typescript
// components/uploads/ImageGallery.tsx
'use client'

import { useState } from 'react'
import { SecureImage } from './SecureImage'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface ImageGalleryProps {
  images: Array<{ url: string; path: string; fileName: string }>
  onDelete?: (path: string) => void
}

export function ImageGallery({ images, onDelete }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {images.map((image) => (
          <div key={image.path} className="relative group">
            <SecureImage
              path={image.path}
              alt={image.fileName}
              width={150}
              height={150}
              className="rounded-lg object-cover cursor-pointer"
              onClick={() => setSelectedImage(image.path)}
            />
            {onDelete && (
              <button
                onClick={() => onDelete(image.path)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1
                           opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <SecureImage
              path={selectedImage}
              alt="Full size"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
```

---

## Investigation Form with Uploads

```
┌─────────────────────────────────────────────────────────┐
│  🔬 Add Investigation                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Date:  [📅 January 30, 2026                    ]      │
│                                                         │
│  Type:  [X-Ray                                  ]      │
│                                                         │
│  Report:                                                │
│  [                                               ]      │
│  [                                               ]      │
│                                                         │
│  Images:                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │     📁 Drag & drop files here                  │   │
│  │        or click to select                       │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Uploaded:                                              │
│  ┌───────┐  ┌───────┐  ┌───────┐                      │
│  │ 📷    │  │ 📷    │  │ 📄    │                      │
│  │xray.jpg│ │scan.png│ │report.pdf                    │
│  │   ✕   │  │   ✕   │  │   ✕   │                      │
│  └───────┘  └───────┘  └───────┘                      │
│                                                         │
│            [Cancel]  [Save Investigation ✓]             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Database Integration

```typescript
// Save investigation with images
async function createInvestigationWithImages(
  patientId: string,
  data: {
    date: Date;
    type: string;
    report: string;
  },
  images: Array<{ url: string; path: string; fileName: string }>,
) {
  return prisma.investigation.create({
    data: {
      patientId,
      date: data.date,
      type: data.type,
      report: data.report,
      images: {
        create: images.map((img) => ({
          url: img.path, // Store path, generate signed URL on read
          fileName: img.fileName,
        })),
      },
    },
    include: { images: true },
  });
}
```

---

## File Size & Type Limits

| Setting                     | Value                            |
| --------------------------- | -------------------------------- |
| Max file size               | 10 MB                            |
| Allowed types               | Image (PNG, JPG, GIF, WebP), PDF |
| Max files per investigation | 10                               |

---

## Security Considerations

1. **Private bucket**: All files require signed URLs
2. **Clinic isolation**: Users can only access their clinic's files
3. **Signed URL expiry**: URLs expire after 1 hour for viewing
4. **File validation**: Check MIME type on upload
5. **Path structure**: Organized by clinic → patient → investigation
