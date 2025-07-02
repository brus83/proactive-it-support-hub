
import React from 'react';
import { sanitizeHtml } from '@/utils/sanitizer';

interface SafeHtmlRendererProps {
  html: string;
  className?: string;
}

const SafeHtmlRenderer: React.FC<SafeHtmlRendererProps> = ({ html, className }) => {
  const sanitizedHtml = sanitizeHtml(html);
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default SafeHtmlRenderer;
