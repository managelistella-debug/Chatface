'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-primary">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 border border-border rounded-lg text-sm text-primary bg-transparent placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/8 ${error ? 'border-destructive' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
