import useSWR from "swr";
import { API } from "@/lib/api";

const fetcher = (path) =>
  API(path).then((res) => {
    if (!res.ok) throw new Error("overview request failed");
    return res.json();
  });

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

