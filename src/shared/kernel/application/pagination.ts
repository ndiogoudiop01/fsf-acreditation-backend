export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function buildPageResult<T>(
  items: T[],
  total: number,
  request: PageRequest,
): PageResult<T> {
  return {
    items,
    total,
    page: request.page,
    pageSize: request.pageSize,
    totalPages: Math.max(1, Math.ceil(total / request.pageSize)),
  };
}

export function toSkipTake(request: PageRequest): {
  skip: number;
  take: number;
} {
  return {
    skip: (request.page - 1) * request.pageSize,
    take: request.pageSize,
  };
}
