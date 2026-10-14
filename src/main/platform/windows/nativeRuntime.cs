using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using Microsoft.Win32;
using Windows.Media.Control;
using Windows.Storage.Streams;
using Windows.Devices.Bluetooth;
using Windows.Devices.Enumeration;

// A single MTA executor: native callbacks publish changes, stdin carries commands.
// Track metadata and artwork never run on the command or playback-state path.
public static class RippleNativeRuntime {
  static readonly object gate = new object(), outputGate = new object();
  static readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 16 * 1024 * 1024 };
  static readonly Dictionary<GlobalSystemMediaTransportControlsSession, Entry> entries = new Dictionary<GlobalSystemMediaTransportControlsSession, Entry>();
  static readonly List<DeviceWatcher> watchers = new List<DeviceWatcher>();
  static readonly HashSet<string> connected = new HashSet<string>();
  static readonly CancellationTokenSource stopping = new CancellationTokenSource();
  static readonly SemaphoreSlim listGate = new SemaphoreSlim(1, 1);
  static GlobalSystemMediaTransportControlsSessionManager manager;
  static Task mediaReady, bluetoothReady;
  static bool bluetoothInitialized;
  static bool? camera, microphone;
  static string lastMedia, lastDevices;
  static readonly System.Reflection.MethodInfo asTask = typeof(System.WindowsRuntimeSystemExtensions).GetMethods().First(m => m.Name == "AsTask" && m.IsGenericMethod && m.GetGenericArguments().Length == 1 && m.GetParameters().Length == 1 && m.GetParameters()[0].ParameterType.Name == "IAsyncOperation`1");
  sealed class Entry {
    public GlobalSystemMediaTransportControlsSession Session;
    public Dictionary<string, object> Data;
    public string Signature = "";
    public int Version, MetadataError, PlaybackError;
    public Timer RefreshTimer;
    public Windows.Foundation.TypedEventHandler<GlobalSystemMediaTransportControlsSession, MediaPropertiesChangedEventArgs> PropertiesHandler;
    public Windows.Foundation.TypedEventHandler<GlobalSystemMediaTransportControlsSession, PlaybackInfoChangedEventArgs> PlaybackHandler;
  }
  static Task<T> Await<T>(object operation) {
    return (Task<T>)asTask.MakeGenericMethod(typeof(T)).Invoke(null,new [] {operation});
  }
  static void Send(object value) { lock(outputGate) { Console.WriteLine(json.Serialize(value)); Console.Out.Flush(); } }
  static int NativeCode(Exception error) { var native = error.GetBaseException() as System.ComponentModel.Win32Exception; return native == null ? error.GetBaseException().HResult : native.NativeErrorCode; }
  static void Error(string scope, Exception error) { if(scope == "media") { lock(outputGate) lastMedia = null; } Send(new { kind = "error", scope = scope, code = NativeCode(error) }); }
  static Dictionary<string, object> Snapshot() {
    lock(gate) {
      var data = new List<object>(); var failed = new List<string>(); var errors = new List<object>(); int artworkBytes = 0;
      var current = manager == null ? null : manager.GetCurrentSession();
      var duplicates = new Dictionary<string, int>();
      foreach(var entry in entries.Values) {
        var source = entry.Session.SourceAppUserModelId;
        bool unique = entries.Keys.Count(s => s.SourceAppUserModelId == source) == 1;
        int index; duplicates.TryGetValue(source, out index); duplicates[source] = ++index;
        string id = unique ? source : source + "#" + index;
        if(entry.Data == null || entry.MetadataError != 0 || entry.PlaybackError != 0) { failed.Add(id); errors.Add(new { Code = entry.MetadataError != 0 ? entry.MetadataError : entry.PlaybackError, Kind = entry.MetadataError != 0 ? "MediaProperties" : "PlaybackInfo" }); continue; }
        var row = new Dictionary<string, object>(entry.Data);
        row["Id"] = id; row["Source"] = source;
        row["Current"] = current != null && current.SourceAppUserModelId == source;
        if(!unique) foreach(string key in new [] {"Previous","Next","Play","Pause","Toggle"}) row[key] = false;
        var art = row["Artwork"] as string;
        if(art != null) { artworkBytes += art.Length * 3 / 4; if(artworkBytes > 5 * 1024 * 1024) row["Artwork"] = null; }
        data.Add(row);
      }
      return new Dictionary<string, object> { {"Sessions", data}, {"FailedIds", failed}, {"Errors", errors} };
    }
  }
  static void PublishMedia() {
    try { var value = Snapshot(); lock(outputGate) { string encoded = json.Serialize(value); if(encoded == lastMedia) return; lastMedia = encoded; Send(new { kind = "media", value = value }); } }
    catch(Exception error) { Error("media", error); }
  }
  static void Playback(Entry entry) {
    try {
      var info = entry.Session.GetPlaybackInfo();
      lock(gate) {
        if(!entries.ContainsKey(entry.Session)) return;
        if(entry.Data == null) entry.Data = new Dictionary<string, object> { {"Title", ""}, {"Artist", ""}, {"Album", ""}, {"Artwork", null}, {"ApplicationPath", ApplicationPath(entry.Session.SourceAppUserModelId)} };
        entry.PlaybackError = 0; var d = entry.Data; var c = info.Controls;
        d["Status"] = info.PlaybackStatus.ToString().ToLowerInvariant();
        d["Previous"] = c.IsPreviousEnabled; d["Next"] = c.IsNextEnabled;
        d["Play"] = c.IsPlayEnabled; d["Pause"] = c.IsPauseEnabled; d["Toggle"] = c.IsPlayPauseToggleEnabled;
      }
      PublishMedia();
    } catch(Exception error) { lock(gate) entry.PlaybackError = NativeCode(error); PublishMedia(); }
  }
  static string ApplicationPath(string source) {
    if(!source.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) || source.IndexOfAny(new [] {'\\','/',':','*','?','"','<','>','|'}) >= 0) return null;
    var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    foreach(var process in Process.GetProcessesByName(System.IO.Path.GetFileNameWithoutExtension(source))) using(process) { try { paths.Add(process.MainModule.FileName); } catch { } }
    return paths.Count == 1 ? paths.First() : null;
  }
  static async Task Refresh(Entry entry) {
    int version; lock(gate) { version = ++entry.Version; }
    try {
      var props = await Await<GlobalSystemMediaTransportControlsSessionMediaProperties>(entry.Session.TryGetMediaPropertiesAsync());
      var signature = props.Title + "\0" + props.Artist + "\0" + props.AlbumTitle;
      bool changed;
      lock(gate) {
        if(version != entry.Version || !entries.ContainsKey(entry.Session)) return;
        entry.MetadataError = 0; changed = signature != entry.Signature; entry.Signature = signature;
        entry.Data["Title"] = props.Title; entry.Data["Artist"] = props.Artist; entry.Data["Album"] = props.AlbumTitle;
        if(changed) entry.Data["Artwork"] = null;
      }
      Playback(entry);
      // Players may publish the new thumbnail after publishing the title.
      // Every properties event refreshes it, even when the text is unchanged.
      var ignored = Artwork(entry, props.Thumbnail, version);
    } catch(Exception error) { lock(gate) entry.MetadataError = NativeCode(error); PublishMedia(); }
  }
  static async Task Artwork(Entry entry, Windows.Storage.Streams.IRandomAccessStreamReference thumbnail, int version) {
    string art = null;
    try {
      if(thumbnail != null) using(var stream = await Await<IRandomAccessStreamWithContentType>(thumbnail.OpenReadAsync())) {
        if(stream.Size > 0 && stream.Size <= 5 * 1024 * 1024) using(var reader = new DataReader(stream.GetInputStreamAt(0))) {
          uint count = await Await<uint>(reader.LoadAsync((uint)stream.Size)); var bytes = new byte[count]; reader.ReadBytes(bytes);
          art = "data:" + stream.ContentType.Split(',')[0] + ";base64," + Convert.ToBase64String(bytes);
        }
      }
      lock(gate) { if(version != entry.Version || !entries.ContainsKey(entry.Session)) return; entry.Data["Artwork"] = art; }
      PublishMedia();
    } catch(Exception error) { Error("artwork", error.GetBaseException()); }
  }
  static async Task Reconcile() {
    await listGate.WaitAsync();
    try {
      var all = manager.GetSessions().ToArray(); var fresh = new List<Entry>();
      lock(gate) {
        foreach(var old in entries.Keys.Where(s => !all.Contains(s)).ToArray()) {
          var e = entries[old]; e.Version++; e.RefreshTimer.Dispose();
          old.MediaPropertiesChanged -= e.PropertiesHandler; old.PlaybackInfoChanged -= e.PlaybackHandler; entries.Remove(old);
        }
        foreach(var session in all) if(!entries.ContainsKey(session)) {
          var e = new Entry { Session = session }; entries[session] = e; fresh.Add(e);
          e.RefreshTimer = new Timer(_ => { var ignored = Refresh(e); }, null, Timeout.Infinite, Timeout.Infinite);
          e.PropertiesHandler = (_s,_a) => { lock(gate) e.Version++; try { e.RefreshTimer.Change(35, Timeout.Infinite); } catch(ObjectDisposedException) { } };
          e.PlaybackHandler = (_s,_a) => Playback(e);
          session.MediaPropertiesChanged += e.PropertiesHandler; session.PlaybackInfoChanged += e.PlaybackHandler;
          Playback(e);
        }
      }
      PublishMedia(); await Task.WhenAll(fresh.Select(Refresh));
    } finally { listGate.Release(); }
  }
  static async Task StartMedia() {
    try {
      manager = await Await<GlobalSystemMediaTransportControlsSessionManager>(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());
      manager.SessionsChanged += (_s,_a) => { var ignored = ReconcileSafe(); };
      manager.CurrentSessionChanged += (_s,_a) => PublishMedia();
      await Reconcile();
    } catch(Exception error) { Error("media", error); throw; }
  }
  static async Task ReconcileSafe() { try { await Reconcile(); } catch(Exception error) { Error("media", error); } }
  static object DeviceSnapshot() { lock(gate) return new { bluetooth = bluetoothInitialized ? (bool?)(connected.Count > 0) : null, camera = camera, microphone = microphone }; }
  static void PublishDevices() { var value = DeviceSnapshot(); lock(outputGate) { var encoded = json.Serialize(value); if(encoded == lastDevices) return; lastDevices = encoded; Send(new { kind = "devices", value = value }); } }
  static Task StartBluetooth() {
    var ready = new TaskCompletionSource<bool>(); int remaining = 2;
    foreach(var selector in new [] { BluetoothDevice.GetDeviceSelectorFromConnectionStatus(BluetoothConnectionStatus.Connected), BluetoothLEDevice.GetDeviceSelectorFromConnectionStatus(BluetoothConnectionStatus.Connected) }) {
      var watcher = DeviceInformation.CreateWatcher(selector); watchers.Add(watcher);
      watcher.Added += (_s,d) => { lock(gate) connected.Add(d.Id); PublishDevices(); };
      watcher.Removed += (_s,d) => { lock(gate) connected.Remove(d.Id); PublishDevices(); };
      watcher.Updated += (_s,d) => { var ignored = UpdateBluetooth(d.Id); };
      watcher.EnumerationCompleted += (_s,_a) => { if(Interlocked.Decrement(ref remaining) == 0) { lock(gate) bluetoothInitialized = true; PublishDevices(); ready.TrySetResult(true); } };
      watcher.Stopped += (_s,_a) => { if(!stopping.IsCancellationRequested && watcher.Status == DeviceWatcherStatus.Aborted) { var error = new InvalidOperationException(); lock(gate) bluetoothInitialized = false; PublishDevices(); Error("bluetooth",error); ready.TrySetException(error); } };
      watcher.Start();
    }
    return ready.Task;
  }
  static async Task UpdateBluetooth(string id) {
    try {
      var d = await Await<DeviceInformation>(DeviceInformation.CreateFromIdAsync(id, new [] { "System.Devices.Aep.IsConnected" }));
      object value; if(d.Properties.TryGetValue("System.Devices.Aep.IsConnected", out value) && value is bool) { lock(gate) { if((bool)value) connected.Add(id); else connected.Remove(id); } PublishDevices(); }
    } catch(Exception error) { Error("bluetooth",error); }
  }
  [DllImport("advapi32.dll")] static extern int RegNotifyChangeKeyValue(IntPtr key, bool subtree, uint filter, IntPtr signal, bool asynchronous);
  static bool Capture(RegistryKey key) {
    if(key == null) return false;
    foreach(var name in key.GetSubKeyNames()) using(var child = key.OpenSubKey(name)) {
      var stop = child == null ? null : child.GetValue("LastUsedTimeStop");
      if(stop is long && (long)stop == 0 || Capture(child)) return true;
    }
    return false;
  }
  static void WatchCapture() {
    try {
      using(var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore"))
      using(var signal = new AutoResetEvent(false)) {
        while(!stopping.IsCancellationRequested) {
          if(key != null) { int code = RegNotifyChangeKeyValue(key.Handle.DangerousGetHandle(), true, 0x10000005, signal.SafeWaitHandle.DangerousGetHandle(), true); if(code != 0) throw new System.ComponentModel.Win32Exception(code); }
          using(var c = key == null ? null : key.OpenSubKey("webcam")) using(var m = key == null ? null : key.OpenSubKey("microphone")) {
            lock(gate) { camera = Capture(c); microphone = Capture(m); } PublishDevices();
          }
          if(key == null || WaitHandle.WaitAny(new [] {signal, stopping.Token.WaitHandle}) == 1) return;
        }
      }
    } catch(Exception error) { lock(gate) { camera = null; microphone = null; } PublishDevices(); Error("capture",error); }
  }
  [DllImport("shell32.dll", CharSet=CharSet.Unicode)] static extern IntPtr ShellExecute(IntPtr window, string verb, string file, string args, string directory, int show);
  static async Task Command(Dictionary<string, object> request) {
    int id = Convert.ToInt32(request["id"]);
    try {
      string method = (string)request["method"]; object value = null;
      if(method == "media") { await mediaReady; value = Snapshot(); }
      else if(method == "devices") { value = DeviceSnapshot(); }
      else if(method == "open") {
        long code = ShellExecute(IntPtr.Zero, "open", (string)request["target"], null, null, 1).ToInt64();
        if(code <= 32) throw new System.ComponentModel.Win32Exception((int)code);
      } else if(method == "control") {
        await mediaReady; string source = (string)request["source"], action = (string)request["command"];
        var matches = manager.GetSessions().Where(candidate => candidate.SourceAppUserModelId == source).ToArray();
        if(matches.Length != 1) throw new InvalidOperationException();
        var s = matches[0]; var info = s.GetPlaybackInfo(); var c = info.Controls; bool accepted = false;
        if(action == "previous" && c.IsPreviousEnabled) accepted = await Await<bool>(s.TrySkipPreviousAsync());
        else if(action == "next" && c.IsNextEnabled) accepted = await Await<bool>(s.TrySkipNextAsync());
        else if(action == "playpause") {
          if(info.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing && c.IsPauseEnabled) accepted = await Await<bool>(s.TryPauseAsync());
          else if(c.IsPlayEnabled) accepted = await Await<bool>(s.TryPlayAsync());
          else if(c.IsPlayPauseToggleEnabled) accepted = await Await<bool>(s.TryTogglePlayPauseAsync());
        }
        if(!accepted) throw new InvalidOperationException();
        Entry entry; lock(gate) entries.TryGetValue(s, out entry); if(entry != null) Playback(entry);
      } else throw new InvalidOperationException();
      Send(new { kind = "response", id = id, ok = true, value = value });
    } catch(Exception error) { Send(new { kind = "response", id = id, ok = false, code = NativeCode(error) }); }
  }
  [MTAThread] public static void Main(string[] args) {
    Console.OutputEncoding = new UTF8Encoding(false); Console.InputEncoding = new UTF8Encoding(false);
    if(args.Length == 1) { var parent = Process.GetProcessById(int.Parse(args[0])); parent.EnableRaisingEvents = true; parent.Exited += (_s,_a) => Environment.Exit(0); }
    mediaReady = StartMedia();
    try { bluetoothReady = StartBluetooth(); } catch(Exception error) { Error("bluetooth",error); bluetoothReady = Task.FromException(error); }
    new Thread(WatchCapture) { IsBackground = true }.Start();
    Send(new { kind = "ready" });
    string line;
    while((line = Console.ReadLine()) != null) {
      try { var request = json.Deserialize<Dictionary<string, object>>(line); var ignored = Command(request); }
      catch(Exception error) { Error("runtime",error); }
    }
    stopping.Cancel(); foreach(var watcher in watchers) try { watcher.Stop(); } catch { }
  }
}


