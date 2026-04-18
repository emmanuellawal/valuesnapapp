import type { ReactNode } from 'react';

export function getTextContent(children: ReactNode): string {
  return Array.isArray(children)
    ? children.map((child) => String(child)).join('')
    : String(children);
}