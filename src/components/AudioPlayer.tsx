"use client";

export default function AudioPlayer({ src }: { src?: string }) {
  if (!src) return <div className="text-sm text-gray-500">No audio yet</div>;
  return <audio controls src={src} className="w-full" />;
}
