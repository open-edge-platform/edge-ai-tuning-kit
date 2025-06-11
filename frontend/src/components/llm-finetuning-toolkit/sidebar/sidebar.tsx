// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Brain,
  FolderKanban,
  Home,
  PanelLeft,
  ChevronDown,
  MessageSquare,
  FileText,
  Database,
  Cpu,
} from "lucide-react";
import { useCallback, useState, useMemo } from "react";
import { useProjects } from "@/hooks/llm-finetuning-toolkit/use-projects";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/hooks/llm-finetuning-toolkit/use-projects";

interface navigationLink {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

function Header({
  isCollapsed,
  toggleSidebar,
}: {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}) {
  return (
    <>
      <SidebarHeader className="flex flex-col items-start">
        <div
          className={cn(
            "flex items-center justify-between h-14 pl-4 pr-2 w-full",
            isCollapsed && "justify-center px-2"
          )}
        >
          <div className="flex items-center gap-2">
            <Link href="/">
              <span
                className={cn(
                  "font-semibold text-primary",
                  isCollapsed ? "text-xs" : "text-sm"
                )}
              >
                {isCollapsed ? "EATK" : "Edge AI Tuning Kit"}
              </span>
            </Link>
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="ml-auto"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>
      <div className="border-b border-gray-200 dark:border-gray-700" />
    </>
  );
}

function ProjectSidebar({
  projectId,
  projects,
  isCollapsed,
  pathname,
}: {
  projectId: string | null;
  projects: Project[];
  isCollapsed: boolean;
  pathname: string;
}) {
  const router = useRouter();
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);

  const project = useMemo(() => {
    if (!projectId) return null;
    if (projects.length === 0) return null;

    const formattedProjectId = parseInt(projectId);
    if (isNaN(formattedProjectId)) return null;

    return projects.find((p) => p.id === formattedProjectId) || null;
  }, [projectId, projects]);

  const handleProjectSwitcherOpenChange = (open: boolean) => {
    if (open !== isProjectSwitcherOpen) {
      setIsProjectSwitcherOpen(open);
    }
  };

  const projectNavigation = [
    {
      href: `/llm-finetuning-toolkit/projects/${projectId}/system-message`,
      label: "System Message",
      icon: MessageSquare,
    },
    {
      href: `/llm-finetuning-toolkit/projects/${projectId}/document`,
      label: "Document",
      icon: FileText,
    },
    {
      href: `/llm-finetuning-toolkit/projects/${projectId}/dataset`,
      label: "Dataset",
      icon: Database,
    },
    {
      href: `/llm-finetuning-toolkit/projects/${projectId}/training`,
      label: "Training",
      icon: Cpu,
    },
  ];

  const renderProjectNavItem = useCallback(
    (link: navigationLink) => {
      const isActive = pathname.includes(link.href);
      const Icon = link.icon;

      return (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={isCollapsed ? link.label : undefined}
          >
            <Link
              href={link.href}
              className={cn(
                "flex items-center gap-3 w-full pr-2",
                isActive ? "text-primary" : "text-muted-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate flex-1">{link.label}</span>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    },
    [pathname, isCollapsed]
  );

  return (
    <SidebarContent className="flex flex-col gap-2">
      {/* Back to Dashboard button */}
      <div className={cn("px-3 pt-3", isCollapsed && "px-2")}>
        {isCollapsed ? (
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 mb-2"
            onClick={() => router.push("/llm-finetuning-toolkit/dashboard")}
            title="Back to Dashboard"
          >
            <Home className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start mb-2"
            onClick={() => router.push("/llm-finetuning-toolkit/dashboard")}
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        )}
      </div>
      {/* Project Switcher */}
      <div className={cn("px-3 mb-1", isCollapsed && "px-2")}>
        {isCollapsed ? (
          <DropdownMenu
            open={isProjectSwitcherOpen}
            onOpenChange={handleProjectSwitcherOpenChange}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="w-8 h-8">
                <FolderKanban className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className={cn(p.id === parseInt(projectId || "") && "bg-accent")}
                  onClick={() =>
                    router.push(
                      `/llm-finetuning-toolkit/projects/${p.id}/system-message`
                    )
                  }
                >
                  <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/llm-finetuning-toolkit/projects")}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                <span>All Projects</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu
            open={isProjectSwitcherOpen}
            onOpenChange={handleProjectSwitcherOpenChange}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2 truncate">
                  {project && (
                    <span className="truncate">
                      {project?.name || "Select Project"}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className={cn(p.id === parseInt(projectId || "") && "bg-accent")}
                  onClick={() =>
                    router.push(
                      `/llm-finetuning-toolkit/projects/${p.id}/system-message`
                    )
                  }
                >
                  <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/llm-finetuning-toolkit/projects")}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                <span>All Projects</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {/* Project navigation */}
      <SidebarGroup>
        {!isCollapsed && (
          <SidebarGroupLabel>Project Settings</SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu>
            {projectNavigation.map(renderProjectNavItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

function MainSidebar({
  isCollapsed,
  pathname,
}: {
  isCollapsed: boolean;
  pathname: string;
}) {
  const mainNavigation = [
    {
      href: "/llm-finetuning-toolkit/dashboard",
      label: "Dashboard",
      icon: Home,
    },
    { href: "/llm-finetuning-toolkit/models", label: "Models", icon: Brain },
    {
      href: "/llm-finetuning-toolkit/projects",
      label: "Projects",
      icon: FolderKanban,
    },
  ];

  const renderMenuItem = useCallback(
    (link: navigationLink) => {
      const isActive = pathname === link.href;
      const Icon = link.icon;

      return (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={isCollapsed ? link.label : undefined}
          >
            <Link
              href={link.href}
              className={cn(
                "flex items-center gap-3 w-full pr-2",
                isActive ? "text-primary" : "text-muted-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate flex-1">{link.label}</span>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    },
    [pathname, isCollapsed]
  );

  return (
    <SidebarContent className="flex flex-col gap-2">
      <SidebarGroup>
        {!isCollapsed && <SidebarGroupLabel>Overview</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>{mainNavigation.map(renderMenuItem)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const {
    data: projects,
  } = useProjects();
  const isCollapsed = state === "collapsed";

  // Check if we're on a project page
  const projectPageMatch = pathname.match(
    /^\/llm-finetuning-toolkit\/projects\/([^/]+)(?:\/([^/]+))?/
  );
  const isProjectPage = !!projectPageMatch;
  const projectId = projectPageMatch ? projectPageMatch[1] : null;

  return (
    <Sidebar
      collapsible="icon"
      className="transition-all duration-300 ease-in-out"
    >
      <Header isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

      {isProjectPage ? (
        <ProjectSidebar
          projectId={projectId}
          projects={projects || []}
          isCollapsed={isCollapsed}
          pathname={pathname}
        />
      ) : (
        <>
          <MainSidebar isCollapsed={isCollapsed} pathname={pathname} />
        </>
      )}

      <SidebarFooter
        className={cn(
          "px-1 py-1",
          isCollapsed && "flex flex-col items-center gap-2 px-0"
        )}
      >
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 mt-2"
            title="Expand Sidebar"
          >
            <PanelLeft className="h-4 w-4 rotate-180" />
          </Button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}