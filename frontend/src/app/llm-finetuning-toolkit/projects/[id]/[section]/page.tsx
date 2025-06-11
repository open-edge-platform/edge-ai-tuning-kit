// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { ProjectSettingsPage } from "@/components/llm-finetuning-toolkit/projects/project-settings-page";

export default async function ProjectSectionPage(props: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section } = await props.params;
  return <ProjectSettingsPage projectId={id} section={section} />;
}
