"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "@/lib/pagination";

interface UseInfiniteScrollOptions<T, F> {
  /** Server action that returns a PaginatedResult. */
  fetcher: (
    params: { page: number; pageSize: number } & F,
  ) => Promise<PaginatedResult<T>>;
  /** Page size per request. */
  pageSize?: number;
  /** Additional filters passed to fetcher. When these change, list resets. */
  filters?: F;
  /** Whether to fetch on mount. Defaults to true. */
  enabled?: boolean;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  totalCount: number;
  page: number;
  totalPages: number;
  /** Ref to attach to the sentinel element at bottom of list. */
  sentinelRef: React.RefCallback<HTMLElement>;
  /** Manually load the next page. */
  loadMore: () => void;
  /** Reset and reload from page 1. */
  reset: () => void;
}

export function useInfiniteScroll<T, F = Record<string, never>>({
  fetcher,
  pageSize = DEFAULT_PAGE_SIZE,
  filters,
  enabled = true,
}: UseInfiniteScrollOptions<T, F>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Track the current filters as a serialized string so we can reset on change
  const filtersKey = JSON.stringify(filters ?? {});
  const prevFiltersKey = useRef(filtersKey);

  // Reset when filters change
  useEffect(() => {
    if (prevFiltersKey.current !== filtersKey) {
      prevFiltersKey.current = filtersKey;
      setItems([]);
      setPage(1);
      setHasMore(true);
      setTotalCount(0);
      setTotalPages(0);
    }
  }, [filtersKey]);

  // Fetch data whenever page or filters change
  const isFetching = useRef(false);
  useEffect(() => {
    if (!enabled || isFetching.current) return;

    isFetching.current = true;
    setIsLoading(true);

    const params = { page, pageSize, ...(filters ?? ({} as F)) };
    fetcher(params)
      .then((result) => {
        setItems((prev) =>
          page === 1 ? result.data : [...prev, ...result.data],
        );
        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
      })
      .finally(() => {
        setIsLoading(false);
        isFetching.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtersKey, enabled]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((p) => p + 1);
    }
  }, [isLoading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setTotalCount(0);
    setTotalPages(0);
  }, []);

  // IntersectionObserver callback ref for the sentinel
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore && !isLoading) {
            loadMore();
          }
        },
        { rootMargin: "200px" },
      );
      observerRef.current.observe(node);
    },
    [hasMore, isLoading, loadMore],
  );

  return {
    items,
    isLoading,
    hasMore,
    totalCount,
    page,
    totalPages,
    sentinelRef,
    loadMore,
    reset,
  };
}
