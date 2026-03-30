export function log(context: string, message: string, data?: unknown) {
  console.log(`[${context}] ${message}`, data ?? '');
}

export function logError(context: string, message: string, error: unknown) {
  console.error(`[${context}] ${message}`, error);
}
