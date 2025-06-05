import ProjectCardListSkeleton from "@/components/project/ProjectList/ProjectCardSkeleton";
import ProjectListHeader from "@/components/project/ProjectList/ProjectsListHeader";
import { Stack } from "@mui/material";
import React from "react";

export default function ProjectCardListLoading(): React.JSX.Element {
    return (
        <Stack spacing={3}>
            <ProjectListHeader />
            <ProjectCardListSkeleton />
        </Stack>
    )
}