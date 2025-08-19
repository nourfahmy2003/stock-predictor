import useSWR from "swr";
import { api } from "@/lib/api";

const fetcher = (path) => api(path);

export function useOverview(ticker) {
  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/overview/${ticker}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    data,
    err: error,
    loading: isLoading,
    reload: () => mutate(),
  };
}


