"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string>;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(page: number): string {
    const params = new URLSearchParams(searchParams);
    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8">
      {/* 上一页 */}
      {currentPage > 1 ? (
        <a
          href={buildUrl(currentPage - 1)}
          className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
        >
          上一页
        </a>
      ) : (
        <span className="px-3 py-2 text-sm rounded-lg border text-gray-300 cursor-not-allowed">
          上一页
        </span>
      )}

      {/* 页码 */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <a
            key={p}
            href={buildUrl(p)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              p === currentPage
                ? "bg-blue-600 text-white"
                : "border hover:bg-gray-50"
            }`}
          >
            {p}
          </a>
        )
      )}

      {/* 下一页 */}
      {currentPage < totalPages ? (
        <a
          href={buildUrl(currentPage + 1)}
          className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
        >
          下一页
        </a>
      ) : (
        <span className="px-3 py-2 text-sm rounded-lg border text-gray-300 cursor-not-allowed">
          下一页
        </span>
      )}
    </nav>
  );
}
