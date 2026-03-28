export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Parse ?page=1&limit=25 from query string with safe defaults and bounds. */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query['limit'] ?? '25'), 10) || 25));
  return { page, pageSize };
}

/** Slice a pre-filtered array into a single page. */
export function paginate<T>(items: T[], params: PaginationParams): PaginatedResult<T> {
  const { page, pageSize } = params;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
