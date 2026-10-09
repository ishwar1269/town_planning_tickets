' Town Planning Tickets - Silent Background Service Launcher
' Runs Backend and Frontend completely in the background with zero CMD popups.

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
currentDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' Stop any existing instances on ports 3000 and 5000 first
WshShell.Run "cmd /c ""cd /d """ & currentDir & """ && stop.bat""", 0, True

' Start Backend in hidden window (0 = hide window)
WshShell.Run "cmd /c ""cd /d """ & currentDir & "\backend"" && node server.js""", 0, False

' Start Frontend in hidden window
WshShell.Run "cmd /c ""cd /d """ & currentDir & "\frontend"" && call npm.cmd run dev -- --host 0.0.0.0 --port 3000""", 0, False

' Wait 4 seconds and open default browser
WScript.Sleep 4000
WshShell.Run "http://localhost:3000"
