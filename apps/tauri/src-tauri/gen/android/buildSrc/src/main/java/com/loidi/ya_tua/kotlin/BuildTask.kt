import java.io.File
import org.apache.tools.ant.taskdefs.condition.Os
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.logging.LogLevel
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

open class BuildTask : DefaultTask() {
    @Input
    var rootDirRel: String? = null
    @Input
    var target: String? = null
    @Input
    var release: Boolean? = null

    @TaskAction
    fun assemble() {
        if (Os.isFamily(Os.FAMILY_WINDOWS)) {
            // On Windows, use cmd to execute pnpm
            val executables = listOf("pnpm.cmd", "pnpm.bat", "pnpm")
            var lastException: Exception? = null
            for (executable in executables) {
                try {
                    runTauriCli(executable)
                    return
                } catch (e: Exception) {
                    lastException = e
                }
            }
            throw lastException ?: GradleException("Failed to execute pnpm")
        } else {
            runTauriCli("pnpm")
        }
    }

    fun runTauriCli(executable: String) {
        val rootDirRel = rootDirRel ?: throw GradleException("rootDirRel cannot be null")
        val target = target ?: throw GradleException("target cannot be null")
        val release = release ?: throw GradleException("release cannot be null")
        val args = mutableListOf("tauri", "android", "android-studio-script")

        if (project.logger.isEnabled(LogLevel.DEBUG)) {
            args.add("-vv")
        } else if (project.logger.isEnabled(LogLevel.INFO)) {
            args.add("-v")
        }
        if (release) {
            args.add("--release")
        }
        args.addAll(listOf("--target", target))

        project.exec {
            workingDir(File(project.projectDir, rootDirRel))
            if (Os.isFamily(Os.FAMILY_WINDOWS)) {
                commandLine("cmd", "/c", executable, *args.toTypedArray())
            } else {
                executable(executable)
                args(args)
            }
        }.assertNormalExitValue()
    }
}