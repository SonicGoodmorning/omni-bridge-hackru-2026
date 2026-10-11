import { SAMPLE_CONVERSATION } from "./study";
import type { BridgeMode, BridgeResult, Engine, Locale } from "./types";

export interface BridgeState {
  mode: BridgeMode;
  locale: Locale;
  sectionId: string;
  text: string;
  engine: Engine;
  status: "idle" | "loading" | "ready" | "error";
  result: BridgeResult | null;
  released: BridgeResult | null;
  error: string | null;
  reviewConfirmed: boolean;
  activeRequestId: string | null;
}

export function initialBridgeState(liveAvailable: boolean): BridgeState {
  return {
    mode: "consent", locale: "en-US", sectionId: "randomization", text: SAMPLE_CONVERSATION,
    engine: liveAvailable ? "live" : "sample", status: "idle", result: null,
    released: null, error: null, reviewConfirmed: false, activeRequestId: null,
  };
}

export type BridgeAction =
  | { type: "configure"; patch: Partial<Pick<BridgeState, "mode" | "locale" | "sectionId" | "text" | "engine">> }
  | { type: "start"; requestId: string }
  | { type: "success"; result: BridgeResult }
  | { type: "failure"; requestId: string; message: string }
  | { type: "review"; value: boolean }
  | { type: "release" }
  | { type: "cancel" }
  | { type: "reset" };

export function bridgeReducer(state: BridgeState, action: BridgeAction): BridgeState {
  switch (action.type) {
    case "configure": {
      if (Object.entries(action.patch).every(([key, value]) => state[key as keyof BridgeState] === value)) return state;
      return { ...state, ...action.patch, status: "idle", result: null, released: null, error: null, reviewConfirmed: false, activeRequestId: null };
    }
    case "start":
      return { ...state, status: "loading", result: null, error: null, reviewConfirmed: false, activeRequestId: action.requestId };
    case "success":
      if (state.activeRequestId !== action.result.requestId || action.result.locale !== state.locale || action.result.mode !== state.mode || action.result.engine !== state.engine) return state;
      return { ...state, status: "ready", result: action.result, error: null, reviewConfirmed: false, activeRequestId: null };
    case "failure":
      if (state.activeRequestId !== action.requestId) return state;
      return { ...state, status: "error", result: null, error: action.message, reviewConfirmed: false, activeRequestId: null };
    case "review":
      return { ...state, reviewConfirmed: Boolean(state.result?.canRelease && action.value) };
    case "release":
      if (state.status !== "ready" || !state.result?.canRelease || !state.reviewConfirmed) return state;
      return { ...state, released: state.result };
    case "cancel":
      return { ...state, status: "idle", result: null, error: null, reviewConfirmed: false, activeRequestId: null };
    case "reset":
      return { ...initialBridgeState(state.engine === "live"), locale: state.locale, mode: state.mode, engine: state.engine };
  }
}
