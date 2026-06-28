// Shared pagination types for server-side offset pagination

export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Helper to compute skip/take from page/pageSize.
 */
export function paginationToSkipTake(params: PaginationParams) {
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, params.pageSize);
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Helper to build a PaginatedResult from prisma count + data.
 */
export function buildPaginatedResult<T>(
  data: T[],
  totalCount: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalCount / params.pageSize);
  return {
    data,
    page: params.page,
    pageSize: params.pageSize,
    totalCount,
    totalPages,
    hasMore: params.page < totalPages,
  };
}
