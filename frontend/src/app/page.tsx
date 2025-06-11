// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toolList } from "@/settings/tool-list";

const ITEMS_PER_PAGE = 9;

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTools = toolList.filter(
    (tool) =>
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTools = filteredTools.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to first page when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background px-8">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold pt-5">Edge AI Tuning Kit</h1>
        </div>
      </header>
      {/* Hero Section */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Enhance your AI workflow with powerful tools
          </h1>
          <p className="text-xl text-muted-foreground text-center mb-8 max-w-5xl mx-auto">
            Optimized tools to simplify tasks and automate AI development
            processes
          </p>

          <div className="relative max-w-2xl mx-auto">
            <Input
              type="text"
              placeholder="Search for AI tools, models, and extensions..."
              className="w-full py-6 pl-12 pr-4 bg-card border-border rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          </div>
        </div>

        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 opacity-20 dark:opacity-10 animate-float">
          <div className="w-64 h-64 rounded-full bg-primary/50 blur-3xl"></div>
        </div>
        <div className="absolute top-0 right-0 opacity-20 dark:opacity-10 animate-float">
          <div className="w-64 h-64 rounded-full bg-primary/50 blur-3xl"></div>
        </div>
        <div className="absolute bottom-0 left-0 opacity-20 dark:opacity-10">
          <div className="w-64 h-64 rounded-full bg-secondary/50 blur-3xl"></div>
        </div>
        <div className="absolute bottom-0 left-0 opacity-20 dark:opacity-10">
          <div className="w-64 h-64 rounded-full bg-secondary/50 blur-3xl"></div>
        </div>
      </section>
      {/* Main Content */}
      <div className="container mx-auto pt-4 px-8 pb-16">
        {/* Tool Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Tools</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedTools.map((tool) =>
              tool.disabled ? (
                <div
                  key={tool.id}
                  className="block bg-card border border-border rounded-lg overflow-hidden cursor-not-allowed opacity-80 h-full flex flex-col"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-muted rounded-lg">
                        {React.createElement(tool.icon, {
                          className: "h-10 w-10",
                        })}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{tool.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {tool.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {tool.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-muted text-muted-foreground"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto p-4 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {tool.category}
                    </span>
                    <div className="flex gap-2">
                      {tool.experimental && (
                        <Badge className="bg-yellow-500/80 dark:bg-yellow-600/80 hover:bg-yellow-600 dark:hover:bg-yellow-700 text-primary-foreground">
                          Experimental
                        </Badge>
                      )}
                      {tool.disabled && (
                        <Badge className="bg-muted hover:bg-muted/80 text-muted-foreground">
                          Coming soon
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href={tool.route}
                  key={tool.id}
                  className="block bg-card border border-border rounded-lg overflow-hidden hover:border-blue-500 transition-colors h-full flex flex-col"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-muted rounded-lg">
                        {React.createElement(tool.icon, {
                          className: "h-10 w-10",
                        })}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{tool.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {tool.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {tool.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-muted text-muted-foreground"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto p-4 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {tool.category}
                    </span>
                    <div className="flex gap-2">
                      {tool.experimental && (
                        <Badge className="bg-yellow-500/80 dark:bg-yellow-600/80 hover:bg-yellow-600 dark:hover:bg-yellow-700 text-primary-foreground">
                          Experimental
                        </Badge>
                      )}
                      {tool.disabled && (
                        <Badge className="bg-muted hover:bg-muted/80 text-muted-foreground">
                          Coming soon
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end mt-8 gap-2">
            <div className="flex items-center space-x-1 rounded-lg bg-muted p-1 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-md"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-3 py-1 text-sm">
                <span className="font-medium">{currentPage}</span>
                <span className="text-muted-foreground"> / {totalPages}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 rounded-md"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
      {/* Footer */}
      <footer className="bg-background border-t border-border px-4 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-muted-foreground pt-2">
                Intel Edge AI Platform @ v2025.2.0
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
