#define _GNU_SOURCE
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <limits.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/inotify.h>
#include <sys/prctl.h>
#include <unistd.h>

static int video_name(const char *name) {
  if (strncmp(name, "video", 5) || !name[5]) return 0;
  for (const char *p = name + 5; *p; ++p) if (!isdigit((unsigned char)*p)) return 0;
  return 1;
}

static int watch_devices(int fd, const char *directory) {
  DIR *dir = opendir(directory);
  if (!dir) return -1;
  struct dirent *entry;
  int failed = 0;
  while ((entry = readdir(dir))) {
    if (!video_name(entry->d_name)) continue;
    char file[PATH_MAX];
    if (snprintf(file, sizeof(file), "%s/%s", directory, entry->d_name) >= (int)sizeof(file)) {
      failed = 1;
      continue;
    }
    if (inotify_add_watch(fd, file, IN_OPEN | IN_CLOSE | IN_DELETE_SELF | IN_MOVE_SELF) < 0 && errno != ENOENT)
      failed = 1;
  }
  closedir(dir);
  return failed ? -1 : 0;
}

int main(int argc, char **argv) {
  const char *directory = argc == 2 ? argv[1] : "/dev";
  pid_t parent = getppid();
  if (parent == 1 || prctl(PR_SET_PDEATHSIG, SIGTERM) < 0 || getppid() != parent) return 1;
  int fd = inotify_init1(IN_CLOEXEC);
  if (fd < 0) return 1;
  int root = inotify_add_watch(fd, directory, IN_CREATE | IN_DELETE | IN_MOVED_FROM | IN_MOVED_TO | IN_DELETE_SELF | IN_MOVE_SELF);
  if (root < 0 || watch_devices(fd, directory) < 0) { close(fd); return 1; }
  setvbuf(stdout, NULL, _IOLBF, 0);
  puts("ready");
  union { char bytes[65536]; struct inotify_event align; } buffer;
  for (;;) {
    ssize_t count = read(fd, buffer.bytes, sizeof(buffer.bytes));
    if (count < 0) { if (errno == EINTR) continue; break; }
    if (!count) break;
    int changed = 0, refresh = 0;
    for (char *p = buffer.bytes; p < buffer.bytes + count;) {
      struct inotify_event *event = (struct inotify_event *)p;
      if (event->mask & IN_Q_OVERFLOW) { changed = refresh = 1; }
      else if (event->wd == root) {
        if (event->mask & (IN_DELETE_SELF | IN_MOVE_SELF | IN_IGNORED)) { close(fd); return 1; }
        if (event->len && video_name(event->name)) changed = refresh = 1;
      } else if (event->mask & (IN_OPEN | IN_CLOSE | IN_DELETE_SELF | IN_MOVE_SELF | IN_IGNORED)) changed = 1;
      p += sizeof(*event) + event->len;
    }
    if (refresh && watch_devices(fd, directory) < 0) break;
    if (changed && puts("camera") == EOF) break;
  }
  close(fd);
  return 1;
}
