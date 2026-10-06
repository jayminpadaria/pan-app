export interface ApiResponseFormat {
  message: string;
  code?: number;
  result?: unknown;
  additionalInfo?: unknown;
}

export interface ApiListResponseFormat<T = unknown> extends ApiResponseFormat {
  result?: {
    documentItems: T[];
    totalDocument: number;
  };
}
