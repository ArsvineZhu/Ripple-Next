// Native window behaviour for the Island window (macOS only; N-API, so it needs no per-Electron rebuild).
// Electron has no API for the full NSWindowCollectionBehavior mask. Its `hiddenInMissionControl`
// option only sets Transient (not Stationary). This module owns the intentional mask as a whole:
// CanJoinAllSpaces | FullScreenAuxiliary | Stationary | Transient.
//
// Electron's getNativeWindowHandle() buffer is not a usable NSView*/NSWindow* here, so windows are
// matched by title against [NSApp windows] instead.
#include <node_api.h>
#import <AppKit/AppKit.h>
#include <stdlib.h>
#include <string.h>

static const NSWindowCollectionBehavior kIslandMask =
    NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorFullScreenAuxiliary |
    NSWindowCollectionBehaviorStationary | NSWindowCollectionBehaviorTransient;

static NSWindow *WindowByTitle(NSString *title) {
  if (title == nil || title.length == 0) return nil;
  for (NSWindow *window in [NSApp windows]) {
    if ([window.title isEqualToString:title]) return window;
  }
  return nil;
}

static NSString *TitleArg(napi_env env, napi_value value) {
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, nullptr, 0, &length) != napi_ok) {
    napi_throw_type_error(env, nullptr, "title must be a string");
    return nil;
  }
  char *buffer = (char *)malloc(length + 1);
  if (buffer == nullptr) {
    napi_throw_error(env, nullptr, "out of memory");
    return nil;
  }
  size_t written = 0;
  napi_get_value_string_utf8(env, value, buffer, length + 1, &written);
  NSString *title = [[NSString alloc] initWithBytes:buffer length:written encoding:NSUTF8StringEncoding];
  free(buffer);
  return title;
}

static bool Flag(napi_env env, napi_value options, const char *name) {
  napi_value value;
  bool enabled = false;
  if (napi_get_named_property(env, options, name, &value) == napi_ok) {
    napi_get_value_bool(env, value, &enabled);
  }
  return enabled;
}

static NSWindowCollectionBehavior MaskFromOptions(napi_env env, napi_value options) {
  // Whole-mask decision from the caller; do not OR onto Electron's existing bits.
  NSWindowCollectionBehavior mask = 0;
  if (Flag(env, options, "canJoinAllSpaces")) mask |= NSWindowCollectionBehaviorCanJoinAllSpaces;
  if (Flag(env, options, "fullScreenAuxiliary")) mask |= NSWindowCollectionBehaviorFullScreenAuxiliary;
  if (Flag(env, options, "stationary")) mask |= NSWindowCollectionBehaviorStationary;
  if (Flag(env, options, "transient")) mask |= NSWindowCollectionBehaviorTransient;
  return mask;
}

static void SetStringProp(napi_env env, napi_value object, const char *key, const char *value) {
  napi_value string_value;
  napi_create_string_utf8(env, value ? value : "", NAPI_AUTO_LENGTH, &string_value);
  napi_set_named_property(env, object, key, string_value);
}

static void SetInt64Prop(napi_env env, napi_value object, const char *key, int64_t value) {
  napi_value number_value;
  napi_create_int64(env, value, &number_value);
  napi_set_named_property(env, object, key, number_value);
}

static void SetBoolProp(napi_env env, napi_value object, const char *key, bool value) {
  napi_value bool_value;
  napi_get_boolean(env, value, &bool_value);
  napi_set_named_property(env, object, key, bool_value);
}

static void SetDoubleProp(napi_env env, napi_value object, const char *key, double value) {
  napi_value number_value;
  napi_create_double(env, value, &number_value);
  napi_set_named_property(env, object, key, number_value);
}

static void AppendFlagName(napi_env env, napi_value array, uint32_t *index, NSWindowCollectionBehavior mask,
                           NSWindowCollectionBehavior bit, const char *name) {
  if ((mask & bit) == 0) return;
  napi_value string_value;
  napi_create_string_utf8(env, name, NAPI_AUTO_LENGTH, &string_value);
  napi_set_element(env, array, (*index)++, string_value);
}

static napi_value FlagsArray(napi_env env, NSWindowCollectionBehavior mask) {
  napi_value array;
  napi_create_array(env, &array);
  uint32_t index = 0;
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorCanJoinAllSpaces, "canJoinAllSpaces");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorMoveToActiveSpace, "moveToActiveSpace");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorManaged, "managed");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorTransient, "transient");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorStationary, "stationary");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorParticipatesInCycle, "participatesInCycle");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorIgnoresCycle, "ignoresCycle");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorFullScreenPrimary, "fullScreenPrimary");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorFullScreenAuxiliary, "fullScreenAuxiliary");
  AppendFlagName(env, array, &index, mask, NSWindowCollectionBehaviorFullScreenNone, "fullScreenNone");
  return array;
}

static napi_value DescribeWindow(napi_env env, NSWindow *window) {
  napi_value item;
  napi_create_object(env, &item);
  SetStringProp(env, item, "title", window.title.UTF8String);
  SetInt64Prop(env, item, "number", (int64_t)window.windowNumber);
  SetInt64Prop(env, item, "level", (int64_t)window.level);
  NSWindowCollectionBehavior behavior = window.collectionBehavior;
  SetInt64Prop(env, item, "collectionBehavior", (int64_t)behavior);
  napi_set_named_property(env, item, "flags", FlagsArray(env, behavior));
  SetBoolProp(env, item, "visible", window.isVisible);
  SetBoolProp(env, item, "key", window.isKeyWindow);
  SetBoolProp(env, item, "main", window.isMainWindow);
  SetBoolProp(env, item, "onActiveSpace", window.isOnActiveSpace);
  SetBoolProp(env, item, "canBecomeKey", window.canBecomeKeyWindow);
  NSRect frame = window.frame;
  napi_value frame_object;
  napi_create_object(env, &frame_object);
  SetDoubleProp(env, frame_object, "x", frame.origin.x);
  SetDoubleProp(env, frame_object, "y", frame.origin.y);
  SetDoubleProp(env, frame_object, "width", frame.size.width);
  SetDoubleProp(env, frame_object, "height", frame.size.height);
  napi_set_named_property(env, item, "frame", frame_object);
  SetStringProp(env, item, "className", NSStringFromClass(window.class).UTF8String);
  return item;
}

static napi_value DescribeAppWindows(napi_env env, napi_callback_info info) {
  (void)info;
  NSArray<NSWindow *> *windows = [NSApp windows];
  napi_value result;
  napi_create_array_with_length(env, windows.count, &result);
  NSUInteger index = 0;
  for (NSWindow *window in windows) {
    napi_set_element(env, result, index++, DescribeWindow(env, window));
  }
  return result;
}

static napi_value ApplyIslandBehavior(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 2) {
    napi_throw_type_error(env, nullptr, "applyIslandBehavior(title, options)");
    return nullptr;
  }
  NSString *title = TitleArg(env, argv[0]);
  if (title == nil) return nullptr;
  NSWindow *window = WindowByTitle(title);
  if (window == nil) {
    napi_throw_error(env, nullptr, "no NSWindow matches the island title");
    return nullptr;
  }
  NSWindowCollectionBehavior mask = MaskFromOptions(env, argv[1]);
  [window setCollectionBehavior:mask];
  napi_value applied;
  napi_create_int64(env, (int64_t)[window collectionBehavior], &applied);
  return applied;
}

static napi_value ReadIslandBehavior(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 1) {
    napi_throw_type_error(env, nullptr, "readIslandBehavior(title)");
    return nullptr;
  }
  NSString *title = TitleArg(env, argv[0]);
  if (title == nil) return nullptr;
  NSWindow *window = WindowByTitle(title);
  if (window == nil) {
    napi_value null_value;
    napi_get_null(env, &null_value);
    return null_value;
  }
  napi_value current;
  napi_create_int64(env, (int64_t)[window collectionBehavior], &current);
  return current;
}

static napi_value IslandMaskConstant(napi_env env, napi_callback_info info) {
  (void)info;
  napi_value value;
  napi_create_int64(env, (int64_t)kIslandMask, &value);
  return value;
}

NAPI_MODULE_INIT() {
  napi_value describe;
  napi_value apply;
  napi_value read;
  napi_value expected;
  napi_create_function(env, "describeAppWindows", NAPI_AUTO_LENGTH, DescribeAppWindows, nullptr, &describe);
  napi_create_function(env, "applyIslandBehavior", NAPI_AUTO_LENGTH, ApplyIslandBehavior, nullptr, &apply);
  napi_create_function(env, "readIslandBehavior", NAPI_AUTO_LENGTH, ReadIslandBehavior, nullptr, &read);
  napi_create_function(env, "expectedIslandMask", NAPI_AUTO_LENGTH, IslandMaskConstant, nullptr, &expected);
  napi_set_named_property(env, exports, "describeAppWindows", describe);
  napi_set_named_property(env, exports, "applyIslandBehavior", apply);
  napi_set_named_property(env, exports, "readIslandBehavior", read);
  napi_set_named_property(env, exports, "expectedIslandMask", expected);
  return exports;
}
