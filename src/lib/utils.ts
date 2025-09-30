import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeCoordinates(
  bbox: { x: number; y: number; w: number; h: number },
  pageWidth: number,
  pageHeight: number
) {
  return {
    x: bbox.x / pageWidth,
    y: bbox.y / pageHeight,
    w: bbox.w / pageWidth,
    h: bbox.h / pageHeight,
  }
}

export function denormalizeCoordinates(
  normalizedBbox: { x: number; y: number; w: number; h: number },
  pageWidth: number,
  pageHeight: number
) {
  return {
    x: normalizedBbox.x * pageWidth,
    y: normalizedBbox.y * pageHeight,
    w: normalizedBbox.w * pageWidth,
    h: normalizedBbox.h * pageHeight,
  }
}

/**
 * Read file as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Convert ArrayBuffer to Uint8Array for pdf-lib
 */
export function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer)
}

/**
 * Create a deep copy of Uint8Array to avoid ArrayBuffer detachment issues
 */
export function copyUint8Array(uint8Array: Uint8Array): Uint8Array {
  return new Uint8Array(uint8Array.buffer.slice())
}

/**
 * Create a copy of ArrayBuffer before it gets detached
 */
export function copyArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
  return buffer.slice()
}

/**
 * Generate unique annotation ID
 */
export function generateAnnotationId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate PDF file
 */
export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF' }
  }
  
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' }
  }
  
  if (file.size > 100 * 1024 * 1024) { // 100MB limit
    return { valid: false, error: 'File too large (max 100MB)' }
  }
  
  return { valid: true }
}
