import React from 'react';

export type StatusType = 'processing' | 'ready' | 'failed' | 'uploading';

export const StatusBadge: React.FC<{ status: StatusType | string }> = ({ status }) => {
  let styles = '';
  let dotClass = '';
  let label = status.charAt(0).toUpperCase() + status.slice(1);

  switch (status.toLowerCase()) {
    case 'processing':
      styles = 'bg-amber-100 text-amber-800 border-amber-200';
      dotClass = 'bg-amber-500 animate-pulse';
      break;
    case 'ready':
      styles = 'bg-green-100 text-green-800 border-green-200';
      dotClass = 'bg-green-500';
      break;
    case 'failed':
      styles = 'bg-red-100 text-red-800 border-red-200';
      dotClass = 'bg-red-500';
      break;
    case 'uploading':
      styles = 'bg-blue-100 text-blue-800 border-blue-200';
      dotClass = 'bg-blue-500 animate-pulse';
      break;
    default:
      styles = 'bg-gray-100 text-gray-800 border-gray-200';
      dotClass = 'bg-gray-500';
      label = 'Unknown';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotClass}`}></span>
      {label}
    </span>
  );
};
