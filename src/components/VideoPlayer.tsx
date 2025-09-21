"use client";

export default function VideoPlayer({ src }: { src?: string }) {
  if (!src) return <div className="text-sm text-gray-500">No video yet</div>;
  return (
    <video src={src} className="w-full border rounded" controls playsInline />
  );
}
