'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-primary">{label}</label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-3 py-2 border border-border rounded-lg text-sm text-primary bg-transparent placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/8 resize-y ${error ? 'border-destructive' : ''} ${className}`}
          rows={4}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
