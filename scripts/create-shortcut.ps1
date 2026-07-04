$WshShell = New-Object -ComObject WScript.Shell

$ProjectRoot = "c:\Users\Lenovo\Downloads\Projects\Ai agent os"
$VbsPath = "$ProjectRoot\start-silent.vbs"
$IconPath = "C:\Windows\System32\imageres.dll,81"

# --- Desktop Shortcut ---
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$DesktopShortcut = $WshShell.CreateShortcut("$DesktopPath\AI Team Manager.lnk")
$DesktopShortcut.TargetPath = "C:\Windows\System32\wscript.exe"
$DesktopShortcut.Arguments = """$VbsPath"""
$DesktopShortcut.WorkingDirectory = $ProjectRoot
$DesktopShortcut.Description = "Launch AI Team Manager Command Center"
$DesktopShortcut.IconLocation = $IconPath
$DesktopShortcut.Save()
Write-Output "Desktop shortcut created."

# --- Start Menu Shortcut (makes it searchable in Windows Search) ---
$StartMenuPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
$StartMenuShortcut = $WshShell.CreateShortcut("$StartMenuPath\AI Team Manager.lnk")
$StartMenuShortcut.TargetPath = "C:\Windows\System32\wscript.exe"
$StartMenuShortcut.Arguments = """$VbsPath"""
$StartMenuShortcut.WorkingDirectory = $ProjectRoot
$StartMenuShortcut.Description = "Launch AI Team Manager Command Center"
$StartMenuShortcut.IconLocation = $IconPath
$StartMenuShortcut.Save()
Write-Output "Start Menu shortcut created at: $StartMenuPath\AI Team Manager.lnk"
Write-Output ""
Write-Output "You can now search 'AI Team Manager' in Windows Search, pin it to your Taskbar, or pin it to Start."
