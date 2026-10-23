#include "scroll_events.h"
#import <AppKit/AppKit.h>
#include <string>

// Observe only this app's Island events. AppKit remains responsible for delivering
// the original event to Chromium (including native vertical scrolling).
struct ScrollPacket {
  double at, x, y, dx, dy;
  const char *phase;
  bool control;
};
struct ScrollMonitor {
  id monitor = nil;
  napi_threadsafe_function callback = nullptr;
  bool overflow = false;
};
static ScrollMonitor *activeMonitor = nullptr;

static void Number(napi_env env, napi_value object, const char *key, double value) {
  napi_value number;
  napi_create_double(env, value, &number);
  napi_set_named_property(env, object, key, number);
}
static void Deliver(napi_env env, napi_value callback, void *, void *data) {
  ScrollPacket *packet = static_cast<ScrollPacket *>(data);
  if (env != nullptr && callback != nullptr) {
    napi_value object, phase, control, receiver, result;
    napi_create_object(env, &object);
    Number(env, object, "at", packet->at);
    Number(env, object, "x", packet->x);
    Number(env, object, "y", packet->y);
    Number(env, object, "deltaX", packet->dx);
    Number(env, object, "deltaY", packet->dy);
    napi_create_string_utf8(env, packet->phase, NAPI_AUTO_LENGTH, &phase);
    napi_set_named_property(env, object, "phase", phase);
    napi_get_boolean(env, packet->control, &control);
    napi_set_named_property(env, object, "control", control);
    napi_get_undefined(env, &receiver);
    napi_call_function(env, receiver, callback, 1, &object, &result);
  }
  delete packet;
}
static void Finalize(napi_env, void *data, void *) {
  delete static_cast<ScrollMonitor *>(data);
}
static void Stop(void *) {
  if (!activeMonitor) return;
  ScrollMonitor *state = activeMonitor;
  activeMonitor = nullptr;
  if (state->monitor) {
    [NSEvent removeMonitor:state->monitor];
    state->monitor = nil;
  }
  napi_release_threadsafe_function(state->callback, napi_tsfn_abort);
}
static napi_value StopEvents(napi_env env, napi_callback_info) {
  Stop(nullptr);
  napi_value value;
  napi_get_undefined(env, &value);
  return value;
}
static napi_value StartEvents(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  napi_valuetype callbackType;
  size_t length;
  if (argc != 2 || napi_get_value_string_utf8(env, argv[0], nullptr, 0, &length) != napi_ok ||
      napi_typeof(env, argv[1], &callbackType) != napi_ok || callbackType != napi_function) {
    napi_throw_type_error(env, nullptr, "startScrollEvents(title, callback)");
    return nullptr;
  }
  std::string title(length + 1, '\0');
  napi_get_value_string_utf8(env, argv[0], title.data(), title.size(), &length);
  NSString *windowTitle = [NSString stringWithUTF8String:title.c_str()];
  Stop(nullptr);
  auto *state = new ScrollMonitor();
  napi_value name;
  napi_create_string_utf8(env, "Island scroll events", NAPI_AUTO_LENGTH, &name);
  if (napi_create_threadsafe_function(env, argv[1], nullptr, name, 256, 1, state, Finalize,
                                    nullptr, Deliver, &state->callback) != napi_ok) {
    delete state;
    napi_throw_error(env, nullptr, "could not create scroll event callback");
    return nullptr;
  }
  napi_unref_threadsafe_function(env, state->callback);
  state->monitor = [NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskScrollWheel
    handler:^NSEvent *(NSEvent *event) {
      if (![event.window.title isEqualToString:windowTitle]) return event;
      NSEventPhase phase = event.phase;
      const char *kind = "wheel";
      if (phase & NSEventPhaseCancelled) kind = "cancel";
      else if (phase & NSEventPhaseBegan) kind = "begin";
      else if (phase & NSEventPhaseEnded) kind = "end";
      else if (event.momentumPhase != NSEventPhaseNone) kind = "momentum";
      else if (phase & (NSEventPhaseChanged | NSEventPhaseStationary)) kind = "update";
      else if (phase & NSEventPhaseMayBegin) return event;
      NSView *view = event.window.contentView;
      NSPoint point = [view convertPoint:event.locationInWindow fromView:nil];
      // AppKit's deltas have the opposite sign to DOM WheelEvent. Preserve the
      // user's natural-scrolling setting; do not invert it a second time.
      const double unit = event.hasPreciseScrollingDeltas ? 1 : 40;
      auto *packet = new ScrollPacket{
        event.timestamp * 1000, point.x, view.isFlipped ? point.y : view.bounds.size.height - point.y,
        -event.scrollingDeltaX * unit, -event.scrollingDeltaY * unit,
        state->overflow ? "cancel" : kind,
        (event.modifierFlags & NSEventModifierFlagControl) != 0};
      napi_status status = napi_call_threadsafe_function(state->callback, packet, napi_tsfn_nonblocking);
      state->overflow = status != napi_ok;
      if (status != napi_ok) delete packet;
      return event;
    }];
  activeMonitor = state;
  napi_value available;
  napi_get_boolean(env, state->monitor != nil, &available);
  if (!state->monitor) Stop(nullptr);
  return available;
}
void RegisterScrollEvents(napi_env env, napi_value exports) {
  napi_value start, stop;
  napi_create_function(env, "startScrollEvents", NAPI_AUTO_LENGTH, StartEvents, nullptr, &start);
  napi_create_function(env, "stopScrollEvents", NAPI_AUTO_LENGTH, StopEvents, nullptr, &stop);
  napi_set_named_property(env, exports, "startScrollEvents", start);
  napi_set_named_property(env, exports, "stopScrollEvents", stop);
  napi_add_env_cleanup_hook(env, Stop, nullptr);
}
