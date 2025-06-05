// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import { enqueueSnackbar } from "notistack"
import React, { useEffect } from "react"

export default function Snackbar({ open, variant, message }: { open: boolean, variant: "default" | "error" | "success" | "warning" | "info" | undefined, message: string }): React.JSX.Element {
    useEffect(() => {
        if (open) {
            enqueueSnackbar(message, { variant })
        }
    }, [open, variant, message])

    // eslint-disable-next-line react/jsx-no-useless-fragment -- nothing to return
    return <></>
}