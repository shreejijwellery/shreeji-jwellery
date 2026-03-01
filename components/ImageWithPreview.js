import React, { useState } from 'react';

/**
 * Reusable image component: thumbnail with hover preview (slightly bigger) and click-to-open popup.
 * @param {string} src - Image URL (e.g. proxy URL for S3)
 * @param {string} [alt] - Alt text
 * @param {string} [thumbnailClass] - Tailwind classes for thumbnail size, e.g. "h-10 w-10"
 * @param {string} [className] - Extra classes for wrapper
 */
export default function ImageWithPreview({ src, alt = '', thumbnailClass = 'h-10 w-10', className = '' }) {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <div
        className={`relative inline-block group ${className}`}
        onClick={() => setPopupOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className={`object-cover rounded border cursor-pointer transition-transform group-hover:scale-105 ${thumbnailClass}`}
        />
        {/* Hover: slightly bigger preview above thumbnail */}
        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl border p-1">
            <img
              src={src}
              alt={alt}
              className="object-contain w-24 h-24 rounded"
            />
          </div>
        </div>
      </div>

      {/* Click: full popup */}
      {popupOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPopupOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setPopupOpen(false)}
          aria-label="Close image"
        >
          <button
            type="button"
            onClick={() => setPopupOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          />
        </div>
      )}
    </>
  );
}
