"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FavoriteButton({
  listingId,
}: {
  listingId: string;
}) {
  const router = useRouter();

  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/favorites/${encodeURIComponent(listingId)}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("دریافت وضعیت علاقه‌مندی ناموفق بود.");
        }

        return response.json() as Promise<{
          isFavorite: boolean;
        }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setFavorite(data.isFavorite);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("وضعیت ذخیره آگهی دریافت نشد.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [listingId]);

  async function toggleFavorite() {
    if (busy || loading || error) return;

    setBusy(true);

    try {
      const response = await fetch(
        `/api/favorites/${encodeURIComponent(listingId)}`,
        {
          method: favorite ? "DELETE" : "POST",
          credentials: "same-origin",
        }
      );

      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }

      if (!response.ok) {
        throw new Error("امکان تغییر علاقه‌مندی وجود ندارد.");
      }

      const result = (await response.json()) as {
        isFavorite: boolean;
      };

      setFavorite(result.isFavorite);
      router.refresh();
    } catch {
      setError("عملیات انجام نشد. صفحه را دوباره بارگذاری کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hy-favorite-control">
      <button
        type="button"
        className={
          favorite
            ? "hy-favorite-button hy-favorite-active"
            : "hy-favorite-button"
        }
        onClick={toggleFavorite}
        aria-pressed={favorite}
        disabled={loading || busy || Boolean(error)}
      >
        <span aria-hidden="true">
          {favorite ? "♥" : "♡"}
        </span>
        {loading
          ? "در حال بررسی..."
          : busy
            ? "در حال ذخیره..."
            : favorite
              ? "حذف از علاقه‌مندی‌ها"
              : "ذخیره آگهی"}
      </button>

      {error && (
        <p className="hy-favorite-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}