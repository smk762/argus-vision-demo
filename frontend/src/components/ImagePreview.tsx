"use client";

interface ImagePreviewProps {
  url: string;
}

export function ImagePreview({ url }: ImagePreviewProps) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-border bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Analyzed image"
        className="w-full h-auto max-h-[600px] object-contain"
      />
    </div>
  );
}
