// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Stack } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useChat } from '@ai-sdk/react'
import { enqueueSnackbar } from 'notistack';

import { type TaskProps } from '@/types/task';
import {
  useGetModelIDInterval,
  useStartInferenceService,
  useStopInferenceService,
} from '@/hooks/api-hooks/use-service-api';
import InfoTypography from '@/components/common/InfoTypography';

import { ChatBody, ChatHeader, ChatLoading } from '../../Chat';

export default function TrainingEvaluation({
  taskID,
  task,
  isTaskLoading,
}: {
  taskID: number;
  task?: TaskProps;
  isTaskLoading: boolean;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  // START, WAIT, READY, STOP, FAIL
  const [evaluationState, setEvaluationState] = useState('START');
  const [currentModelID, setCurrentModelID] = useState('');
  const [currentDevice, setCurrentDevice] = useState('cpu');
  const [isInit, setIsInit] = useState(false);
  const { data: modelID } = useGetModelIDInterval(evaluationState === 'WAIT');
  const {
    messages,
    input,
    setInput,
    append,
    isLoading: isGettingResponse,
    setMessages,
    stop: stopChat,
  } = useChat({
    body: {
      modelID: currentModelID,
      max_tokens: task?.inference_configs.max_new_tokens ?? 512,
      temperature: task?.inference_configs.temperature ?? 0.01,
    },
  });
  const startInferenceService = useStartInferenceService();
  const stopInferenceService = useStopInferenceService();

  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView();
    }
  });

  // Onload
  const onInit = useCallback((): void => {
    queryClient.removeQueries({ queryKey: ['models'] });
    startInferenceService
      .mutateAsync({ id: taskID })
      .then((response) => {
        if (!response.status) {
          enqueueSnackbar(`${response.message}`, { variant: 'error' });
          setEvaluationState('FAIL');
        } else {
          enqueueSnackbar(`${response.message}`, { variant: 'success' });
          setEvaluationState('WAIT');
        }
      })
      .catch((err: unknown) => {
        console.log(err);
      });
  }, [queryClient, startInferenceService, taskID]);

  useEffect(() => {
    if (!isInit) {
      onInit();
      setIsInit(true);
    }
  }, [isInit, onInit]);

  useEffect(() => {
    if (modelID && evaluationState === 'WAIT') {
      const modelIDList = modelID.split('/');
      if (parseInt(modelIDList[3]) === taskID) {
        setCurrentModelID(modelID.toString());
        setEvaluationState('READY');
      }
    }
  }, [modelID, evaluationState, taskID]);

  const handleStartChat = (device: string): void => {
    const startService = (): void => {
      setEvaluationState('START');
      setCurrentDevice(device);
      startInferenceService.mutate(
        { id: taskID, device },
        {
          onSuccess: (response) => {
            if (!response.status) {
              enqueueSnackbar(`${response.message}`, { variant: 'error' });
              setEvaluationState('FAIL');
            } else {
              enqueueSnackbar(`${response.message}`, { variant: 'success' });
              setEvaluationState('WAIT');
            };
          },
        }
      );
    };

    if (currentModelID) {
      stopInferenceService.mutate(
        { id: taskID },
        {
          onSuccess: (response) => {
            if (!response.status) {
              enqueueSnackbar(`${response.message}`, { variant: 'error' });
              setEvaluationState('FAIL');
            } else {
              queryClient.removeQueries({ queryKey: ['models'] });
              setCurrentModelID('');
              setInput('');
              setMessages([]);
              
              if (currentDevice === device) {
                enqueueSnackbar(`${response.message}`, { variant: 'success' });
                setEvaluationState('STOP');

              } else {
                // if device was changed without manually stopping the service first
                startService();
              }
            };
          },
        }
      );
    } else {
      startService();
    };
  };

  const handleEnter = async (event: React.KeyboardEvent<HTMLDivElement> | undefined): Promise<void> => {
    if (event?.key !== 'Enter' || isGettingResponse) {
      return;
    }
    await handleOnSend();
  };

  const handleOnSend = async (): Promise<void> => {
    if (currentModelID === '') {
      enqueueSnackbar('Failed to get the model id from server.', { variant: 'error' });
      return;
    }
    setInput('');
    void append({ content: input, role: 'user' });
  };

  const handleStop = (): void => {
    stopChat();
  };

  const handleClear = (): void => {
    if (isGettingResponse) {
      stopChat();
    }
    setMessages([]);
  };

  return (
    <>
      {!isTaskLoading && task ? (
        <Stack gap="1rem">
          <InfoTypography>Evaluate the model by chat with it. Adjust the chat parameters in the settings.</InfoTypography>
          <ChatHeader status={evaluationState} handleStartChat={handleStartChat} task={task} />
          {evaluationState !== 'READY' ? (
            <ChatLoading evaluationState={evaluationState} />
          ) : (
            <ChatBody
              data={messages}
              message={input}
              scrollRef={scrollRef}
              isGettingResponse={isGettingResponse}
              handleEnter={handleEnter}
              setMessage={setInput}
              handleOnSend={handleOnSend}
              handleStop={handleStop}
              handleClear={handleClear}
            />
          )}
        </Stack>
      ) : null}
    </>
  );
}
