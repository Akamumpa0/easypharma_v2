import React, { useState, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import api from '../lib/api.js';
import { getErrorMessage, getUploadUrl } from '../lib/utils.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

/**
 * Resolve a stored image path (e.g. "/medicines/abc.jpg") into a full URL.
 * Handles both absolute data-URLs (from instant preview) and relative storage paths.
 */
function resolveImageSrc(src) {
  return getUploadUrl(src);
}

/**
 * Reusable image upload component.
 *
 * Props:
 *   currentImage  — stored path from DB (e.g. "/medicines/abc.jpg")
 *   type          — 'medicine' | 'profile'
 *   entityId      — medicine UUID (required when type='medicine')
 *   onUpload(data)— called after successful upload with API response
 *   onDelete()    — called after successful delete
 *   size          — preview size class (default 'w-48 h-48')
 *   label         — optional label text
 */
export default function ImageUpload({
  currentImage,
  onUpload,
  onDelete,
  type = 'medicine',
  entityId,
  size = 'w-48 h-48',
  label,
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(resolveImageSrc(currentImage));
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validate = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, and WEBP images are allowed';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File size must be less than ${MAX_SIZE_MB} MB`;
    }
    return null;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validate(file);
    if (err) { setError(err); return; }

    setError('');

    // Show instant preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    doUpload(file);
  };

  const doUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const endpoint = type === 'profile'
        ? '/images/profile'
        : `/images/medicine/${entityId}`;

      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const storedPath = res.data.imageUrl ?? res.data.profilePhoto;
      setPreview(resolveImageSrc(storedPath));
      onUpload?.(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setPreview(resolveImageSrc(currentImage)); // revert on error
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this image?')) return;
    setError('');
    try {
      const endpoint = type === 'profile'
        ? '/images/profile'
        : `/images/medicine/${entityId}`;
      await api.delete(endpoint);
      setPreview(null);
      onDelete?.();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  return (
    <div className="space-y-2">
      {label && <p className="label">{label}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload image"
      />

      {preview ? (
        /* ── Image preview with overlay actions ─────────────── */
        <div className={`relative inline-block ${size}`}>
          <img
            src={preview}
            alt="Uploaded image"
            className={`${size} object-cover rounded-lg border-2 border-gray-200`}
          />

          {uploading && (
            <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center gap-1">
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
              <span className="text-white text-xs">Uploading…</span>
            </div>
          )}

          {!uploading && (
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                type="button"
                onClick={openPicker}
                className="p-1.5 bg-white rounded-full shadow hover:bg-gray-50 transition-colors"
                title="Replace image"
                aria-label="Replace image"
              >
                <Upload className="w-3.5 h-3.5 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 bg-white rounded-full shadow hover:bg-red-50 transition-colors"
                title="Delete image"
                aria-label="Delete image"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Upload dropzone ─────────────────────────────────── */
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          className={`${size} border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary-400 hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500`}
          aria-label="Upload image"
        >
          {uploading ? (
            <>
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-500">Uploading…</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-gray-300" />
              <span className="text-sm text-gray-500">Click to upload</span>
              <span className="text-xs text-gray-400">PNG · JPEG · WEBP · max {MAX_SIZE_MB} MB</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
