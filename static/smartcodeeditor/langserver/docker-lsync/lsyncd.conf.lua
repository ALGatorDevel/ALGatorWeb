settings {
    logfile = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd.status",
    statusInterval = 10
}

local source = os.getenv("LSYNC_SOURCE") or "/algator_root/data_root/projects"
local target = os.getenv("LSYNC_TARGET") or "/algator_lsync_root"

sync {
    default.rsync,
    source = source,
    target = target,
    delay = 1,
    delete = true,
    rsync = {
        archive = true,
        verbose = false,
        _extra = {
            "--checksum",
            "--prune-empty-dirs",
            "--filter=P .classpath",
            "--filter=P .project",
            "--filter=P .settings/***",
            "--filter=P bin/***",
            "--filter=P .smartcode-lsync-ready",
            "--include=*/",
            "--include=*.java",
            "--include=*.c",
            "--include=*.cpp",
            "--include=*.cc",
            "--include=*.cxx",
            "--include=*.h",
            "--include=*.hpp",
            "--include=*.jar",
            "--include=algorithm.json",
            "--include=project.json",
            "--include=.classpath",
            "--include=.project",
            "--include=.settings/",
            "--include=.settings/**",
            "--include=pom.xml",
            "--include=build.gradle",
            "--include=build.gradle.kts",
            "--include=CMakeLists.txt",
            "--include=compile_commands.json",
            "--exclude=*"
        }
    }
}
