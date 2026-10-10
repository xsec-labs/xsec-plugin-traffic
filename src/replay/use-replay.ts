import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { getReplayAttempts, openTrafficTool, replayTraffic } from "../api/traffic";
import { requiresSensitiveHostConfirmation } from "../proxy";
import type { PluginHost, ReplayAttempt, ReplayResult } from "../types";
import { replayFeedback } from "./feedback";
import { useReplayEvents, useReplayLayout, useReplayResult, useReplaySource } from "./replay-effects";
import { useReplayState, type ReplayConfirmation, type ReplayState } from "./replay-state";
import { replayScheme, replayTargetError } from "./target";

const MIN_PANE_PERCENT = 25;
const MAX_PANE_PERCENT = 75;

/** Append the response attempt when replay history does not already contain it. */
export function replayResponseHistory(history: ReplayAttempt[], response: ReplayResult) {
  if (!response.attempt || history.some((item) => item.id === response.attempt?.id)) return history;
  return [...history, response.attempt];
}

/** Add a response attempt and publish the updated selection through replay state. */
function includeResponseAttempt(history: ReplayAttempt[], response: ReplayResult, state: ReplayState) {
  const items = replayResponseHistory(history, response);
  if (items === history) return history;
  state.replaceAttempts(items, true);
  return items;
}

/** Publish replay completion or failure feedback to the active replay state. */
function applyReplayFeedback(response: ReplayResult, state: ReplayState) {
  const feedback = replayFeedback(response);
  if (feedback.kind === "error") state.setError(feedback.message);
  else state.setNotice(feedback.message);
  return feedback;
}

/** Refresh history after replay and report refresh failures. */
async function reconcileReplayResponse(options: {
  response: ReplayResult; state: ReplayState;
  refreshHistory: (selectLatest: boolean) => Promise<ReplayAttempt[]>;
  isCurrent: () => boolean;
}) {
  const { response, state, refreshHistory, isCurrent } = options;
  try {
    const received = await refreshHistory(true);
    if (!isCurrent()) return;
    const history = includeResponseAttempt(received, response, state);
    applyLatestDraft(history, state);
  } catch (reason) {
    const refreshError = `刷新重放历史失败：${String(reason)}`;
    if (isCurrent()) state.setHistoryError(refreshError);
  }
}

/** Confirm approval still matches the complete source, request, and target tuple. */
function sameConfirmation(state: ReplayState, approved: ReplayConfirmation): boolean {
  const source = state.source;
  if (!source) return false;
  return source.flow_id === approved.sourceFlowId
    && source.host === approved.sourceHost
    && source.port === approved.sourcePort
    && source.scheme === approved.sourceScheme
    && state.rawRequest === approved.rawRequest
    && state.scheme === approved.scheme
    && state.targetHost.trim() === approved.targetHost
    && state.targetPort === approved.targetPort;
}

/** Select the latest recorded request as the editable replay draft. */
function applyLatestDraft(history: ReplayAttempt[], state: ReplayState) {
  const latest = history.at(-1);
  if (!latest) return;
  state.drafts.current.set(latest.id, latest.request_raw);
  state.setRawRequest(latest.request_raw);
}

/** Create a pointer handler that resizes the replay request and response panes. */
function useReplayResize(state: ReplayState) {
  const cleanup = useRef<(() => void) | undefined>();
  useEffect(() => () => cleanup.current?.(), []);
  return (event: PointerEvent<HTMLDivElement>) => {
    cleanup.current?.();
    event.preventDefault();
    const move = (next: globalThis.PointerEvent) => {
      const bounds = state.exchangeRef.current?.getBoundingClientRect();
      if (!bounds) throw Error("重放面板调整目标已经卸载");
      const value = state.stacked ? ((next.clientY - bounds.top) / bounds.height) * 100 : ((next.clientX - bounds.left) / bounds.width) * 100;
      state.setPanePercent(Math.min(MAX_PANE_PERCENT, Math.max(MIN_PANE_PERCENT, value)));
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      cleanup.current = undefined;
    };
    cleanup.current = up;
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  };
}

/** Serialize history refreshes and publish only results for the active flow. */
function useReplayHistory(options: { host: PluginHost; flowId: string; state: ReplayState }) {
  const { host, flowId, state } = options;
  const tail = useRef<Promise<void>>(Promise.resolve());
  const identity = useRef<{ host: PluginHost; flowId: string }>(); identity.current = { host, flowId };
  useEffect(() => {
    identity.current = { host, flowId };
    return () => { identity.current = undefined; };
  }, [host, flowId]);
  return useCallback((selectLatest: boolean) => {
    const requested = { host, flowId };
    state.setHistoryError(undefined);
    const request = tail.current.then(async () => {
      const history = await getReplayAttempts(host, flowId);
      const current = identity.current;
      if (current?.host === requested.host && current.flowId === requested.flowId) {
        state.setHistoryError(undefined);
        state.replaceAttempts(history, selectLatest);
      }
      return history;
    });
    tail.current = request.then(() => undefined, () => undefined);
    return request;
  }, [flowId, host, state.replaceAttempts, state.setHistoryError]);
}

/** Validate, confirm, and submit an edited request through the host boundary. */
async function sendReplay(options: {
  host: PluginHost; state: ReplayState; confirmed: boolean;
  refreshHistory: (selectLatest: boolean) => Promise<ReplayAttempt[]>;
  isCurrent: () => boolean;
}) {
  const { host, state, confirmed, refreshHistory, isCurrent } = options;
  if (!state.source || !state.rawRequest.trim()) return;
  state.setError(undefined); state.setNotice(undefined);
  const validationError = replayTargetError(state.targetHost, state.targetPort);
  if (validationError) { state.setError(validationError); return; }
  const targetHost = state.targetHost.trim();
  if (confirmed) {
    const approved = state.confirmation.current;
    state.confirmation.current = undefined;
    if (!approved || !sameConfirmation(state, approved)) {
      state.setConfirmOpen(false);
      return sendReplay({ host, state, confirmed: false, refreshHistory, isCurrent });
    }
  }
  if (!confirmed && requiresSensitiveHostConfirmation({
    sourceHost: state.source.host, sourcePort: state.source.port, sourceScheme: state.source.scheme,
    targetHost, targetPort: state.targetPort, targetScheme: state.scheme, rawRequest: state.rawRequest,
  })) {
    state.confirmation.current = {
      sourceFlowId: state.source.flow_id,
      sourceHost: state.source.host,
      sourcePort: state.source.port,
      sourceScheme: state.source.scheme,
      rawRequest: state.rawRequest,
      scheme: state.scheme,
      targetHost,
      targetPort: state.targetPort,
    };
    state.setConfirmOpen(true); return;
  }
  state.setSending(true);
  try {
    const response = await replayTraffic(host, {
      sourceFlowId: state.source.flow_id, rawRequest: state.rawRequest, scheme: state.scheme,
      targetHost, targetPort: state.targetPort, confirmSensitiveHostChange: confirmed,
    });
    if (!isCurrent()) return;
    if (response.attempt) {
      const responseHistory = includeResponseAttempt(state.attemptsRef.current, response, state);
      applyLatestDraft(responseHistory, state);
    }
    applyReplayFeedback(response, state);
    await reconcileReplayResponse({ response, state, refreshHistory, isCurrent });
  } catch (reason) { if (isCurrent()) state.setError(String(reason)); }
  finally { if (isCurrent()) state.setSending(false); }
}

/** Open the captured replay result in the request-detail workspace tool. */
async function openReplayResult(host: PluginHost, state: ReplayState) {
  if (!state.result) return;
  state.setError(undefined);
  try {
    await openTrafficTool(host, {
      toolId: "request-detail", flowId: state.result.flow_id,
      title: `${state.result.method} ${state.result.host}`,
    });
  } catch (reason) { state.setError(`打开结果流量失败：${String(reason)}`); }
}

/** Compose replay loading, editing, submission, history, and layout state. */
export function useReplay(host: PluginHost, flowId: string, visible: boolean) {
  const state = useReplayState();
  const sender = useRef({ active: true, epoch: 0, busy: false });
  useEffect(() => {
    sender.current.active = true; sender.current.busy = false;
    return () => { sender.current.active = false; sender.current.epoch += 1; };
  }, [host, flowId]);
  const resize = useReplayResize(state);
  const resizeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const decrease = state.stacked ? "ArrowUp" : "ArrowLeft";
    const increase = state.stacked ? "ArrowDown" : "ArrowRight";
    if (![decrease, increase, "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    state.setPanePercent(value => event.key === "Home" ? MIN_PANE_PERCENT : event.key === "End" ? MAX_PANE_PERCENT
      : Math.min(MAX_PANE_PERCENT, Math.max(MIN_PANE_PERCENT, value + (event.key === decrease ? -1 : 1) * (event.shiftKey ? 10 : 5))));
  };
  const selected = state.attempts.find((attempt) => attempt.id === state.selectedId) ?? null;
  const selectedIndex = state.attempts.findIndex((attempt) => attempt.id === state.selectedId);
  const refreshHistory = useReplayHistory({ host, flowId, state });
  useReplaySource({ host, flowId, state, refreshHistory });
  useReplayResult({ host, resultId: selected?.result_flow_id, state });
  useReplayLayout(state);
  useReplayEvents({ host, visible, refreshHistory, setHistoryError: state.setHistoryError });
  const selectAttempt = (index: number) => {
    const attempt = state.attempts[index]; if (!attempt) return;
    state.drafts.current.set(state.selectedId ?? "draft", state.rawRequest);
    state.selectedIdRef.current = attempt.id; state.setSelectedId(attempt.id);
    state.setRawRequest(state.drafts.current.get(attempt.id) ?? attempt.request_raw);
    state.setScheme(replayScheme(attempt.scheme));
    state.setTargetHost(attempt.target_host); state.setTargetPort(attempt.target_port);
  };
  const send = async (confirmed = false) => {
    const owner = sender.current;
    if (!owner.active || owner.busy) return;
    const epoch = owner.epoch; owner.busy = true;
    const isCurrent = () => owner.active && owner.epoch === epoch;
    try { await sendReplay({ host, state, confirmed, refreshHistory, isCurrent }); }
    finally { if (isCurrent()) owner.busy = false; }
  };
  const openResult = () => openReplayResult(host, state);
  const targetValid = replayTargetError(state.targetHost, state.targetPort) === undefined;
  return { ...state, selected, selectedIndex, targetValid, selectAttempt, refreshHistory, send, resize, resizeKey, openResult };
}

export type ReplayModel = ReturnType<typeof useReplay>;
