// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React, { useEffect, useMemo, useState } from 'react';
import { HourglassEmpty, Info, RestartAlt } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  linearProgressClasses,
  Stack,
  styled,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { LineChart } from '@mui/x-charts';
import { enqueueSnackbar } from 'notistack';

import { useRestartTask } from '@/hooks/api-hooks/use-task-api';
import InfoTypography from '@/components/common/InfoTypography';
import { type TaskProps } from '@/types/task';

const BorderLinearProgress = styled(LinearProgress)(() => ({
  height: 5,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    //   backgroundColor: theme.palette.grey[theme.palette.mode === ThemeMode.DARK],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    //   backgroundColor: theme.palette.mode === ThemeMode.DARK ,
  },
}));

export default function TrainingResults({ task, isTaskLoading }: { task?: TaskProps, isTaskLoading: boolean }): React.JSX.Element {
  const [totalEpochs, setTotalEpochs] = useState(0);
  const [currentEpochs, setCurrentEpochs] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  const restartTask = useRestartTask();

  const theme = useTheme();
  const bgcolor = '';
  const color = 'primary.main';
  const lineColor = theme.palette.primary.main;

  const handleRestart = (id: number): void => {
    setIsRestarting(true)
    restartTask.mutate(
      { id },
      {
        onSuccess: (response) => {
          if (response.status) {
            enqueueSnackbar(`Task restart successfully.`, { variant: 'success' });
          } else {
            enqueueSnackbar('Failed to restart task. Please check with admin.', { variant: 'error' });
          }
        },
        onSettled: () => {
          setIsRestarting(false)
        },
      }
    );
  };

  const trainingParameters = useMemo(() => {
    if (!isTaskLoading && task) {
      const modelTrainHistory = task?.results.train_history;
      const modelEvalHistory = task?.results.eval_history;
      setTotalEpochs(task.configs.training_args.num_train_epochs);

      if (modelTrainHistory === undefined || modelEvalHistory === undefined) return null;

      const lastTrainItem = modelTrainHistory[modelTrainHistory.length - 1];
      const lastEvalItem = modelEvalHistory[modelEvalHistory.length - 1];

      const trainingPercent = (lastTrainItem.step * 100) / (task.results.max_steps ?? 0);

      if (lastEvalItem?.epoch) setCurrentEpochs(lastEvalItem?.epoch);

      const trainingData = {
        step: modelTrainHistory.map((step) => step.step),
        loss: modelTrainHistory.map((step) => step.loss),
      };

      const evalData = {
        epoch: modelEvalHistory.map((epoch) => epoch.epoch),
        eval_loss: modelEvalHistory.map((epoch) => epoch.eval_loss),
      };

      const graphData = [
        { title: 'Training Loss', xData: trainingData.step, yData: trainingData.loss, xLabel: 'step', yLabel: 'loss' },
        { title: 'Eval Loss', xData: evalData.epoch, yData: evalData.eval_loss, xLabel: 'epoch', yLabel: 'eval loss' },
      ];
      const trainingGraph = (
        <div>
          <Grid container direction="row" justifyContent="center" spacing={2}>
            {graphData?.map((params, index) => (
              <Grid key={index} item sx={{ mt: 2, width: '50%' }}>
                <Card variant="outlined" sx={{ width: '100%' }}>
                  <CardContent>
                    <LineChart
                      xAxis={[{ data: params.xData.length > 1 ? params.xData : [], label: params.xLabel }]}
                      series={[
                        {
                          data: params.yData.length > 1 ? params.yData : [],
                          color: lineColor,
                          showMark: false,
                        },
                      ]}
                      yAxis={[
                        {
                          label: params.yLabel,
                        },
                      ]}
                      height={300}
                      margin={{ left: 40, right: 40, top: 10, bottom: 50 }}
                      grid={{ vertical: true, horizontal: true }}
                    />
                    <Typography variant="h5" align="center">
                      {params.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ mt: 2 }} />
        </div>
      );

      const trainProgressBar = task.results.stage === "Training Model" ? (
        <Box sx={{ width: '100%', position: 'relative' }}>
          <Typography variant="h5" align="left">
            Progress:
          </Typography>
          <Grid container direction="row" alignItems="center" justifyContent="center">
            <Grid item xs={11}>
              <BorderLinearProgress variant="determinate" value={parseInt(trainingPercent.toFixed(0))} />
            </Grid>
            <Grid item xs={1} marginBottom={0.5}>
              <Typography align="center">{`${trainingPercent.toFixed(0)}%`}</Typography>
            </Grid>
          </Grid>
          <Typography variant="subtitle2" align="left">
            Elapsed Time: {elapsedTime} | Estimated Time Remaining: {estimatedTime}
          </Typography>
        </Box>
      ) : null;
      return { trainingGraph, trainProgressBar };
    }

    return null;
  }, [isTaskLoading, task, elapsedTime, estimatedTime, lineColor]);

  const formattedParameters = useMemo(() => {
    if (!isTaskLoading) {
      const modelMetrics = task?.results.metrics;
      const modelTrainRuntime = task?.results.train_runtime;
      if (modelMetrics === undefined || modelTrainRuntime === undefined) return;
      return [
        { icon: <Info />, title: 'Model Accuracy', value: `${(modelMetrics[1].accuracy ?? 0).toFixed(2)} %` },
        { icon: <Info />, title: 'Model Perplexity', value: (modelMetrics[0].perplexity ?? 0).toFixed(2) },
        { icon: <Info />, title: 'Model Train Loss ', value: modelTrainRuntime[0]?.train_loss.toFixed(2) },
        {
          icon: <Info />,
          title: 'Model Train Runtime ',
          value: `${modelTrainRuntime[0]?.train_runtime.toFixed(2)} secs`,
        },
        {
          icon: <Info />,
          title: 'Model Train Steps Per Seconds',
          value: `${modelTrainRuntime[0]?.train_steps_per_second.toFixed(2)} steps/sec`,
        },
        {
          icon: <Info />,
          title: 'Model Train Samples Per Seconds',
          value: `${modelTrainRuntime[0]?.train_samples_per_second.toFixed(2)} samples/sec`,
        },
      ];
    }
  }, [task, isTaskLoading]);

  useEffect(() => {
    const modelTrainHistory = task?.results.train_history;
    if (modelTrainHistory === undefined) return;

    let intervalId: any = null;

    if (modelTrainHistory && modelTrainHistory.length > 0) {
      intervalId = setInterval(() => {
        //Elapsed Time
        const startTime = new Date(task?.results.start_time ?? 0);
        const elapsedMilliseconds = Date.now() - startTime.getTime();
        const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;
        const formattedElapsedTime = `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        setElapsedTime(formattedElapsedTime);

        //Estimated Time Remaining
        if (task?.results.train_remaining_time === undefined) return;
        const parts: number[] = task?.results.train_remaining_time.split(':').map(parseFloat);
        const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        const recentLogTime = new Date(task?.results.recent_log_time ?? 0);
        const newEstimatedTime = Math.floor(totalSeconds - (Date.now() - recentLogTime.getTime()) / 1000);
        const formattedEstimatedTime =
          newEstimatedTime < 0
            ? '-'
            : newEstimatedTime >= 3600
              ? `~${Math.floor(newEstimatedTime / 3600)} hours left`
              : newEstimatedTime >= 60
                ? `~${Math.floor(newEstimatedTime / 60)} minutes left`
                : `~${Math.floor(newEstimatedTime)} seconds left`;

        setEstimatedTime(formattedEstimatedTime);
      }, 1000);
    }
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId as number);
      }
    };
  }, [task]);

  return (
    <>
      {task && task.status !== 'SUCCESS' ? (
        <Grid container direction="column" justifyContent="space-between" spacing={2}>
          <Grid item xs zeroMinWidth>
            {task.status === 'FAILURE' ? (
              <InfoTypography>
                Model training fail. Please click on the restart button to restart the training.
              </InfoTypography>
            ) : (
              <InfoTypography>Model training is in progress.</InfoTypography>
            )}
          </Grid>
          <Grid item xs zeroMinWidth>
            <Card variant="outlined" sx={{ width: '100%' }}>
              <CardContent>
                <Grid container spacing={0.5}>
                  <Grid item xs={12}>
                    <Grid container spacing={0} alignItems="center">
                      <Grid item xs={6}>
                        {task?.status === 'STARTED' ? (
                          <Box sx={{ display: 'flex ', alignItems: 'center' }}>
                            <CircularProgress size={42} sx={{ marginRight: '12px' }} />
                            <Box sx={{ display: 'flex ', alignItems: 'center' }}>
                              <Grid item>
                                <Typography variant="h5" align="left">
                                  Training:
                                </Typography>
                                <Typography variant="body2" align="left" mt={0.5}>
                                  {task.results.stage !== "Training Model" ? (
                                    <span>{task.results.stage}</span>
                                  ) : (
                                    <span>
                                      Epochs: {currentEpochs}/{totalEpochs}
                                    </span>
                                  )}
                                </Typography>
                              </Grid>
                            </Box>
                          </Box>
                        ) : task?.status === 'PENDING' ? (
                          <Box sx={{ display: 'flex ', alignItems: 'center' }}>
                            <IconButton aria-label="back" sx={{ color: 'black', mr: 1, pointerEvents: 'none' }}>
                              <HourglassEmpty fontSize="large" />
                            </IconButton>
                            <Box sx={{ display: 'flex ', alignItems: 'center' }}>
                              <Grid item>
                                <Typography variant="h5" align="left">
                                  Training Pending
                                </Typography>
                              </Grid>
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex ', alignItems: 'center' }}>
                            <Tooltip title={isRestarting ? "Restarting" : "Restart Training"}>
                              <span>
                                {
                                  isRestarting ?
                                    <CircularProgress /> :
                                    <IconButton
                                      aria-label="back"
                                      color="primary"
                                      onClick={() => {
                                        handleRestart(task.id);
                                      }}
                                    >
                                      <RestartAlt fontSize="large" />
                                    </IconButton>
                                }

                              </span>
                            </Tooltip>
                            <Box sx={{ display: 'flex ', alignItems: 'center' }}>
                              <Grid item>
                                <Typography variant="h5" align="left">
                                  Training Stopped
                                </Typography>
                              </Grid>
                            </Box>
                          </Box>
                        )}
                      </Grid>
                      {task.results.train_history && task.status === 'STARTED' ? (
                        <Grid item xs={6}>
                          {trainingParameters?.trainProgressBar}
                        </Grid>
                      ) : null}
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            <Divider sx={{ mt: 2 }} />
            {trainingParameters?.trainingGraph}
          </Grid>
        </Grid>
      ) : null}

      {task && task.status === 'SUCCESS' ? (
        <>
          <InfoTypography>Model training completed. Check below for model results.</InfoTypography>
          {trainingParameters?.trainingGraph}
          {formattedParameters?.map((params, index) => (
            <Card
              key={index}
              sx={{ bgcolor: bgcolor || '', position: 'relative', border: 1, borderColor: color, mt: 2, mb: 2 }}
            >
              <Grid container justifyContent="space-between" alignItems="center" columnSpacing={2}>
                <Grid item xs={1} sx={{ bgcolor: color, py: 3.5, px: 0 }}>
                  <Typography
                    variant="h5"
                    sx={{ textAlign: 'center', color: '#fff', '& > svg': { width: 32, height: 32 } }}
                    align="center"
                  >
                    {params.icon}
                  </Typography>
                </Grid>
                <Grid item xs={11}>
                  <Stack alignItems={{ xs: 'center', sm: 'flex-start' }} spacing={1} justifyContent="space-between">
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: bgcolor ? '#fff' : '' }}>
                      {params.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: bgcolor ? '#fff' : 'grey.600', display: 'flex', gap: 0.25 }}
                    >
                      {params.value}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Card>
          ))}
        </>
      ) : null}
    </>
  );
}
