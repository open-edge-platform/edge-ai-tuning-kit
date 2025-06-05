// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React, { useMemo, useState } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';

import { useGetTaskByID } from '@/hooks/api-hooks/use-task-api';
import InfoTypography from '@/components/common/InfoTypography';
import ModelConfig from '../TrainingConfigs/ModelConfigs';
import TrainingParameters from '../TrainingConfigs/TrainingParameters';
import ExperimentalParameters from '../TrainingConfigs/ExperimentalParameters';
import { type CreateTaskProps } from '@/types/task';

export default function TrainingParametersList({ taskID }: { taskID: number }): React.JSX.Element {
  const { data: task, isLoading: isTaskLoading } = useGetTaskByID(taskID);
  const [expanded, setExpanded] = useState<string | false>('panel1');
  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const configs: CreateTaskProps | undefined = useMemo(() => {
    if (!isTaskLoading && task) {
      const temp = {
        project_id: task.project_id,
        dataset_id: task.project_id,
        task_type: task.configs.adapter_args.training_type,
        num_gpus: task.configs.training_configs.num_gpus.toString(),
        model_path: task.configs.model_args.model_name_or_path,
        device: task.configs.model_args.device,
        per_device_train_batch_size: task.configs.training_args.per_device_train_batch_size.toString(),
        per_device_eval_batch_size: task.configs.training_args.per_device_eval_batch_size.toString(),
        gradient_accumulation_steps: task.configs.training_args.gradient_accumulation_steps.toString(),
        learning_rate: task.configs.training_args.learning_rate.toString(),
        num_train_epochs: task.configs.training_args.num_train_epochs.toString(),
        lr_scheduler_type: task.configs.training_args.lr_scheduler_type,
        optim: task.configs.training_args.optim,
        enabled_synthetic_generation: task.configs.training_configs.enabled_synthetic_generation,
      }
      return temp
    }
    return undefined
  }, [task, isTaskLoading]);

  return (
    <Stack gap="1rem">
      <InfoTypography>Model training parameters</InfoTypography>
      {
        !isTaskLoading && configs ?
          <Box>
            <ModelConfig
              expanded={expanded}
              taskConfigs={configs}
              handleChange={handleChange}
              disabled
            />
            <TrainingParameters
              expanded={expanded}
              taskConfigs={configs}
              handleChange={handleChange}
              disabled
            />
            <ExperimentalParameters expanded={expanded} handleChange={handleChange} />
          </Box>
          : <CircularProgress />
      }
    </Stack>
  );
}
