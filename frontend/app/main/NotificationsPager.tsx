"use client";

import { useState } from "react";

type NewsItem = {
  id_news: number;
  title: string;
  message: string;
  created_at: string;
};

type NotificationsPagerProps = {
  news: NewsItem[];
};

const PAGE_SIZE = 5;
const PAGE_COUNT = 5;

export default function NotificationsPager({ news }: NotificationsPagerProps) {
  const [page, setPage] = useState(0);
  const visibleNews = news.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const availablePages = Math.min(PAGE_COUNT, Math.max(1, Math.ceil(news.length / PAGE_SIZE)));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {news.length === 0 ? (
          <p className="text-sm text-[#c3ceda]">No notifications yet.</p>
        ) : (
          visibleNews.map((item) => (
            <article key={item.id_news} className="rounded-lg border border-[#7a8798] bg-[#28313d] p-4">
              <div className="mb-1.5 flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-[#ffffff]">{item.title}</h3>
                <span className="shrink-0 text-xs text-[#c3ceda]">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm leading-6 text-[#d3dae3]">{item.message}</p>
            </article>
          ))
        )}
      </div>

      {news.length > PAGE_SIZE && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: availablePages }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPage(index)}
              className={`h-8 min-w-8 rounded-lg border px-3 text-sm font-semibold transition ${
                page === index
                  ? "border-[rgba(57,231,172,0.55)] bg-[rgba(57,231,172,0.16)] text-[#39e7ac]"
                  : "border-[#7a8798] bg-[#28313d] text-[#c3ceda] hover:bg-[#323d4b]"
              }`}
              aria-label={`Show notifications page ${index + 1}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
