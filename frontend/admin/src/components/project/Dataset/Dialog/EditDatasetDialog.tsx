// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { Dialog, DialogContent, DialogTitle, Divider } from '@mui/material';

import { type DatasetProps } from '@/types/dataset';
import ManualEntry from './ManualEntry';
import { type DataProps } from '@/types/data';


export default function EditDatasetDialog({
    dataset,
    datasetData,
    isOpen,
    onClose,
}: {
    dataset: DatasetProps;
    datasetData?: DataProps;
    isOpen: boolean;
    onClose: VoidFunction;
}): React.JSX.Element {

    return (
        <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 'bold' }}>Add Dataset</DialogTitle>
            <Divider />
            <DialogContent>
                <ManualEntry edit datasetData={datasetData} dataset={dataset} onClose={onClose} />
            </DialogContent>
        </Dialog>
    );
}
