export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: string;
}
