"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, articleSearchText, type Article, type ArticleBlock } from "./helpArticles";

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={`h-4 w-4 shrink-0 ${className}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="mt-8 flex flex-col gap-5">
      {blocks.map((block, i) => {
        if (block.type === "p") {
          return (
            <p key={i} className="text-[15px] leading-relaxed text-slate-600 dark:text-neutral-300">
              {block.text}
            </p>
          );
        }
        if (block.type === "steps") {
          return (
            <ol key={i} className="flex flex-col gap-3">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-slate-600 dark:text-neutral-300">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    {j + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={i} className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-600 dark:text-neutral-300">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

export function ResourcesContent() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CATEGORIES.flatMap((cat) =>
      cat.articles
        .filter((article) => articleSearchText(article).includes(q))
        .map((article) => ({ article, category: cat }))
    );
  }, [query]);

  const activeCategory = selectedCategory ? CATEGORIES.find((c) => c.id === selectedCategory) : null;
  const isSearching = query.trim().length > 0;

  function openCategory(id: string) {
    setSelectedCategory(id);
    setSelectedArticle(null);
  }

  function openArticle(article: Article) {
    setSelectedArticle(article);
  }

  function backToCategories() {
    setSelectedCategory(null);
    setSelectedArticle(null);
  }

  function backToCategory() {
    setSelectedArticle(null);
  }

  function clearSearchAndOpen(categoryId: string, article: Article) {
    setQuery("");
    setSelectedCategory(categoryId);
    setSelectedArticle(article);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Help Center</span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          How can we help?
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-neutral-400">
          Search our library or browse by category.
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-2xl">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-neutral-500"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M18.5 11a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedCategory(null);
            setSelectedArticle(null);
          }}
          placeholder="How can we help?"
          className="w-full rounded-2xl border border-transparent bg-white py-4 pl-14 pr-5 text-base text-slate-900 shadow-md outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:text-white dark:shadow-none dark:placeholder:text-neutral-500 dark:focus:ring-2 dark:focus:ring-blue-500"
        />
      </div>

      <div className="mt-14">
        {isSearching ? (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for &quot;{query}&quot;
            </h2>
            {searchResults.length > 0 ? (
              <ul className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-neutral-800 dark:border-neutral-800">
                {searchResults.map(({ article, category }) => (
                  <li key={`${category.id}-${article.slug}`}>
                    <button
                      type="button"
                      onClick={() => clearSearchAndOpen(category.id, article)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                    >
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800 dark:text-neutral-100">{article.title}</span>
                        <span className="mt-0.5 text-xs text-gray-400 dark:text-neutral-500">{category.title}</span>
                      </span>
                      <ArrowIcon className="text-gray-400 dark:text-neutral-500" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500 dark:text-neutral-400">
                No articles matched. Try a different search term.
              </p>
            )}
          </div>
        ) : activeCategory && selectedArticle ? (
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <button
                type="button"
                onClick={backToCategories}
                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Help Center
              </button>
              <span className="text-gray-300 dark:text-neutral-600">/</span>
              <button
                type="button"
                onClick={backToCategory}
                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {activeCategory.title}
              </button>
            </div>
            <button
              type="button"
              onClick={backToCategory}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ArrowIcon className="rotate-180" />
              Back to {activeCategory.title}
            </button>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{selectedArticle.title}</h2>
            <p className="mt-2 text-slate-500 dark:text-neutral-400">{selectedArticle.summary}</p>
            <ArticleBlocks blocks={selectedArticle.blocks} />
          </div>
        ) : activeCategory ? (
          <div>
            <button
              type="button"
              onClick={backToCategories}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ArrowIcon className="rotate-180" />
              Back to categories
            </button>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{activeCategory.title}</h2>
            <p className="mt-2 text-slate-500 dark:text-neutral-400">{activeCategory.description}</p>
            <ul className="mt-8 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-neutral-800 dark:border-neutral-800">
              {activeCategory.articles.map((article) => (
                <li key={article.slug}>
                  <button
                    type="button"
                    onClick={() => openArticle(article)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                  >
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-slate-800 dark:text-neutral-100">{article.title}</span>
                      <span className="mt-0.5 text-xs text-gray-400 dark:text-neutral-500">{article.summary}</span>
                    </span>
                    <ArrowIcon className="shrink-0 text-gray-400 dark:text-neutral-500" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => openCategory(cat.id)}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-left transition-all duration-200 hover:border-blue-300 dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:border-blue-500/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  {cat.icon}
                </div>
                <div className="flex w-full items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">{cat.title}</h3>
                  <ArrowIcon className="text-gray-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-600 dark:text-neutral-500 dark:group-hover:text-blue-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-neutral-400">{cat.description}</p>
                <span className="text-xs font-medium text-gray-400 dark:text-neutral-500">
                  {cat.articles.length} articles
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
