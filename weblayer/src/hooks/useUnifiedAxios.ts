import type { AxiosError, AxiosRequestConfig } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";

interface UseUnifiedAxiosState<T> {
  data: T | null;
  error: AxiosError | null;
  isLoading: boolean;
}

interface UseUnifiedAxiosReturn<T> extends UseUnifiedAxiosState<T> {
  refetch: () => Promise<T | null>;
  mutate: <B = unknown>(
    method: "post" | "put" | "patch" | "delete",
    body?: B,
    config?: AxiosRequestConfig,
  ) => Promise<T | null>;
}

interface UseUnifiedAxiosOptions<T> {
  /** Skip auto-fetch on mount (useful when you only need mutations) */
  skip?: boolean;
  /** Extra axios config for the initial GET */
  config?: AxiosRequestConfig;
  /** Transform raw response data before storing */
  transform?: (raw: unknown) => T;
}

export function useUnifiedAxios<T = unknown>(
  url: string | null,
  options: UseUnifiedAxiosOptions<T> = {},
): UseUnifiedAxiosReturn<T> {
  const { skip = false, config, transform } = options;

  const [state, setState] = useState<UseUnifiedAxiosState<T>>({
    data: null,
    error: null,
    isLoading: !skip && url !== null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const apply = useCallback(
    (raw: unknown): T => (transform ? transform(raw) : (raw as T)),
    [transform],
  );

  const fetchData = useCallback(async (): Promise<T | null> => {
    if (!url) return null;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.get<T>(url, {
        ...config,
        signal: controller.signal,
      });
      const result = apply(response.data);
      setState({ data: result, error: null, isLoading: false });
      return result;
    } catch (err) {
      if (controller.signal.aborted) return null;
      const axiosErr = err as AxiosError;
      setState((prev) => ({ ...prev, error: axiosErr, isLoading: false }));
      return null;
    }
  }, [url, config, apply]);

  const mutate = useCallback(
    async <B = unknown>(
      method: "post" | "put" | "patch" | "delete",
      body?: B,
      mutateConfig?: AxiosRequestConfig,
    ): Promise<T | null> => {
      if (!url) return null;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response =
          method === "delete"
            ? await apiClient.delete<T>(url, mutateConfig)
            : await apiClient[method]<T>(url, body, mutateConfig);

        const result = apply(response.data);
        setState({ data: result, error: null, isLoading: false });
        return result;
      } catch (err) {
        const axiosErr = err as AxiosError;
        setState((prev) => ({ ...prev, error: axiosErr, isLoading: false }));
        return null;
      }
    },
    [url, apply],
  );

  useEffect(() => {
    if (skip || !url) return;
    fetchData();
    return () => abortRef.current?.abort();
  }, [url, skip, fetchData]);

  return { ...state, refetch: fetchData, mutate };
}
