import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoticeCode } from '../../shared/contracts';
import {
  recordAssistantRequest,
  recordRendererAnswerCharacters,
  recordRendererError,
} from '../lib/diagnostics';

interface AssistantRequestTrace {
  requestId: string;
  startedAt: number;
  firstDeltaMs?: number;
  deltaCount: number;
  answerCharacters: number;
}

function elapsed(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function cancelAssistantRequest(trace: AssistantRequestTrace): void {
  recordAssistantRequest({
    requestId: trace.requestId,
    phase: 'cancelled',
    elapsedMs: elapsed(trace.startedAt),
    ...(trace.firstDeltaMs !== undefined ? { firstDeltaMs: trace.firstDeltaMs } : {}),
    deltaCount: trace.deltaCount,
    answerCharacters: trace.answerCharacters,
  });
  void window.electronAPI.cancelAssistant(trace.requestId).catch((error: unknown) => {
    recordRendererError('assistant', error);
  });
}

export function useAssistant() {
  const [assistantError, setAssistantError] = useState<{
    kind: NoticeCode;
    detail?: string;
  } | null>(null);
  const [asked, setAsked] = useState(false);
  const [aiAnswer, setAIAnswer] = useState<string | null>(null);
  const [userText, setUserText] = useState('');
  const requestTraceRef = useRef<AssistantRequestTrace | null>(null);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onAssistantEvent((event) => {
      const trace = requestTraceRef.current;
      if (event.requestId !== trace?.requestId) return;
      if (event.kind === 'delta') {
        trace.deltaCount += 1;
        trace.answerCharacters += event.content.length;
        if (trace.firstDeltaMs === undefined) {
          trace.firstDeltaMs = elapsed(trace.startedAt);
          recordAssistantRequest({
            requestId: trace.requestId,
            phase: 'first-delta',
            firstDeltaMs: trace.firstDeltaMs,
          });
        }
        setAIAnswer((current) => `${current || ''}${event.content}`);
      } else if (event.kind === 'error') {
        requestTraceRef.current = null;
        recordAssistantRequest({
          requestId: trace.requestId,
          phase: 'failed',
          errorCode: event.code,
          elapsedMs: elapsed(trace.startedAt),
          ...(trace.firstDeltaMs !== undefined ? { firstDeltaMs: trace.firstDeltaMs } : {}),
          deltaCount: trace.deltaCount,
          answerCharacters: trace.answerCharacters,
        });
        setAssistantError({ kind: event.code, detail: event.detail });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(
    () => () => {
      const trace = requestTraceRef.current;
      if (trace) {
        requestTraceRef.current = null;
        cancelAssistantRequest(trace);
      }
    },
    [],
  );

  const askAI = useCallback(async () => {
    if (requestTraceRef.current) cancelAssistantRequest(requestTraceRef.current);
    const requestId = crypto.randomUUID();
    const trace: AssistantRequestTrace = {
      requestId,
      startedAt: performance.now(),
      deltaCount: 0,
      answerCharacters: 0,
    };
    requestTraceRef.current = trace;
    recordAssistantRequest({ requestId, phase: 'started' });
    setAssistantError(null);
    setAIAnswer('');
    setAsked(true);
    try {
      const finalAnswer = await window.electronAPI.startAssistant(requestId, userText);
      if (requestTraceRef.current !== trace) return;
      if (finalAnswer) setAIAnswer(finalAnswer);
      if (finalAnswer) trace.answerCharacters = finalAnswer.length;
      requestTraceRef.current = null;
      recordRendererAnswerCharacters(trace.answerCharacters);
      recordAssistantRequest({
        requestId,
        phase: 'completed',
        elapsedMs: elapsed(trace.startedAt),
        ...(trace.firstDeltaMs !== undefined ? { firstDeltaMs: trace.firstDeltaMs } : {}),
        deltaCount: trace.deltaCount,
        answerCharacters: trace.answerCharacters,
      });
    } catch (error) {
      if (requestTraceRef.current !== trace) return;
      requestTraceRef.current = null;
      recordRendererError('assistant', error);
      recordAssistantRequest({
        requestId,
        phase: 'failed',
        elapsedMs: elapsed(trace.startedAt),
        ...(trace.firstDeltaMs !== undefined ? { firstDeltaMs: trace.firstDeltaMs } : {}),
        deltaCount: trace.deltaCount,
        answerCharacters: trace.answerCharacters,
      });
      const detail = error instanceof Error ? error.message : String(error);
      setAssistantError({ kind: 'aiRequestFailed', detail });
    }
  }, [userText]);

  const resetAssistant = useCallback(() => {
    const trace = requestTraceRef.current;
    if (trace) {
      requestTraceRef.current = null;
      cancelAssistantRequest(trace);
    }
    setAsked(false);
    setAIAnswer(null);
    setUserText('');
    setAssistantError(null);
  }, []);

  return {
    assistantError,
    asked,
    setAsked,
    aiAnswer,
    setAIAnswer,
    userText,
    setUserText,
    askAI,
    resetAssistant,
  };
}
