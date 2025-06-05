// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React, { useMemo, useState } from 'react';
import { Assistant, Send, Settings, PowerSettingsNew, Stop, Refresh } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import PerfectScrollbar from 'react-perfect-scrollbar';

import { type TaskProps } from '@/types/task';
import { useDisclosure } from '@/hooks/use-disclosure';

import ChatSettingsDialog from './Dialog/ChatSettingsDialog';
import { type Message } from 'ai';
import Markdown from './Markdown';
import AnimatedDots from './AnimatedDots';

interface ChatBodyProps {
  data: Message[];
  message: string;
  scrollRef: any;
  isGettingResponse: boolean;
  handleEnter: (event: React.KeyboardEvent<HTMLDivElement> | undefined) => void;
  setMessage: (message: string) => void;
  handleOnSend: () => void;
  handleStop: VoidFunction;
  handleClear: VoidFunction;
}

interface ChatLoadingProps {
  evaluationState: string;
}

interface ChatMessageProps {
  data: Message,
  index: number,
  isLoading?: boolean,
}

function ChatMessage(props: ChatMessageProps): React.JSX.Element {
  const { data, index: _index, isLoading } = props
  const safeRole = typeof data.role === 'string' ? data.role : 'unknown';
  const safeContent = typeof data.content === 'string' ? data.content : '';
  
  return (
    <Stack direction={safeRole === 'user' ? 'row-reverse' : 'row'} gap="1rem">
      <Box>
        <Avatar
          sx={{ width: 48, height: 48, bgcolor: safeRole === 'user' ? '' : 'primary.main', mt: '1rem' }}
        >
          {safeRole === 'user' ? 'U' : <Assistant />}
        </Avatar>
      </Box>
      <Card>
        <CardContent
          sx={{
            '&:last-child': {
              paddingBottom: '0',
            },
            px: '2rem',
            pt: '1rem',
          }}
        >
          <Typography variant="body1" color="text.primary" sx={{ fontWeight: 'bold' }}>
            {safeRole}
          </Typography>
          {
            isLoading ?
              <Box sx={{ my: "1.5rem", pt: ".5rem" }}>
                <AnimatedDots />
              </Box>
              :
              <Markdown content={safeContent} />
          }
        </CardContent>
      </Card>
    </Stack>
  )
}

export function ChatLoading(props: ChatLoadingProps): React.JSX.Element {
  const { evaluationState } = props;
  return (
    <Box sx={{ width: '100%' }}>
      <Card variant="outlined" sx={{ width: '100%', borderRadius: '4px' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box display="flex" sx={{ width: '100%', justifyContent: 'center' }}>
            {evaluationState === "WAIT" ? <CircularProgress size={20} sx={{ marginRight: '8px' }} /> : (
              null
            )}
            <Typography variant="h5" sx={{ fontSize: 14 }} gutterBottom component="div">
              {evaluationState === "START"
                ? 'Starting up evaluation service ...'
                : null}
              {evaluationState === "STOP"
                ? 'Click Start button to start and evaluate the model'
                : null}
              {evaluationState === "WAIT"
                ? 'Optimizing & loading model. If this is the first time, it will takes a while to optimize the model'
                : null}
              {evaluationState === "FAIL"
                ? 'Fail to start evaluation. Please check with the admin for more info'
                : null}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export function ChatBody(props: ChatBodyProps): React.JSX.Element {
  const { data, message, scrollRef, isGettingResponse, handleEnter, setMessage, handleOnSend, handleClear, handleStop } = props;

  return (
    <Box sx={{ width: '100%' }}>
      <Card variant="outlined" sx={{ width: '100%', borderRadius: '4px' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper sx={{ width: '100%', mb: 2, mt: -2 }}>
            <PerfectScrollbar style={{ width: '100%', height: 'calc(100vh - 520px)', overflowX: 'hidden' }}>
              <Stack gap="2rem" sx={{ m: "1rem" }}>
                {data.map((d, index) => (
                  // Use a more secure key pattern - include role for extra uniqueness
                  <ChatMessage 
                    key={`chat_message_${d.role}_${index}`} 
                    data={d} 
                    index={index} 
                  />
                ))}
                {
                  isGettingResponse && data[data.length - 1].role !== "assistant" ?
                    <ChatMessage 
                      key="chat_message_loading" 
                      data={{ role: "assistant", content: "Loading..." } as Message} 
                      index={-1} 
                      isLoading 
                    />
                    : null
                }
              </Stack>
              <span ref={scrollRef} />
            </PerfectScrollbar>
          </Paper>
          <Box sx={{ mt: 'auto' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ width: '100%' }}>
                <OutlinedInput
                  fullWidth
                  value={message}
                  onKeyPress={handleEnter}
                  placeholder="Type a message"
                  onChange={(event) => {
                    setMessage(event.target.value);
                  }}
                  startAdornment={<InputAdornment position="start" />}
                  endAdornment={
                    <Stack direction="row" spacing={1} alignItems="center">
                      {
                        isGettingResponse && data.length > 0 ?
                          <IconButton color="error" aria-label="send" onClick={handleStop}>
                            <Stop />
                          </IconButton>
                          : null
                      }
                      {
                        !isGettingResponse && data.length > 0 ?
                          <IconButton color="primary" aria-label="send" onClick={handleClear}>
                            <Refresh />
                          </IconButton>
                          : null
                      }
                      <IconButton color="primary" aria-label="send" onClick={handleOnSend} disabled={isGettingResponse}>
                        <Send />
                      </IconButton>
                    </Stack>
                  }
                />
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export function ChatHeader({
  status,
  handleStartChat,
  task,
}: {
  status: string;
  handleStartChat?: (device: string) => void;
  task: TaskProps;
}): React.JSX.Element {
  const { isOpen, onClose, onOpenChange } = useDisclosure();
  const [ selectedDevice, setSelectedDevice ] = useState('cpu');

  const device = useMemo(() => {
    return [
      {
        name: 'xpu',
        description: 'Intel® Discrete Graphics GPU',
        disable: true
      },
      {
        name: 'cpu',
        description: 'Intel® Processors',
        disable: false,
      },
    ];
  }, [])

  return (
    <>
      <Stack direction="row" gap=".5rem" alignItems="center" width="100%">
        <FormControl 
          sx={{ width: 'max(200px, 20%)' }}
          disabled={status === "START" || status === "WAIT"}
        >
          <InputLabel id="demo-simple-select-autowidth-label" required>
            Device
          </InputLabel>
          <Select
            labelId="demo-simple-select-autowidth-label"
            id="demo-simple-select-autowidth"
            defaultValue="cpu"
            onChange={(e) => {
              setSelectedDevice(e.target.value);
              handleStartChat !== undefined && status !== 'STOP' &&
                handleStartChat(e.target.value);
            }}
            label="Device"
            required
            fullWidth
          >
            {device.map((d, index) => (
              <MenuItem key={index} value={d.name} disabled={d.disable}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box>
          {handleStartChat !== undefined &&
            <Button
              variant="contained"
              disabled={status === "START" || status === "WAIT"}
              onClick={() => {
                handleStartChat(selectedDevice);
              }}
            >
              {status === "START" && 'Stop'}
              {status === "WAIT" && 'Stop'}
              {status === "READY" && 'Stop'}
              {status === "STOP" && 'Start'}
              {status === "FAIL" && 'Stop'}
            </Button>
          }
        </Box>
        <IconButton
          onClick={() => {
            onOpenChange(true);
          }}
          sx={{
            ml: 1,
          }}
        >
          <Settings />
        </IconButton>
        {!handleStartChat &&
          <Box display="flex" sx={{ width: '100%', justifyContent: 'right' }}>
            <IconButton color="primary" size="large" aria-label="more options" disabled>
              <PowerSettingsNew style={{ color: status ? 'green' : 'red' }} />
            </IconButton>
          </Box>
        }
      </Stack>

      <ChatSettingsDialog
        isOpen={isOpen}
        onClose={onClose}
        taskId={task.id}
        inferenceConfigs={task.inference_configs}
      />
    </>
  );
}
