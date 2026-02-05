' BulkListingPro - Launch Chrome with Debug Mode
' This script launches Chrome with the remote debugging port enabled

Option Explicit

Dim WshShell, fso, chromePath, isRunning, userDataDir

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Check common Chrome paths
If fso.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
    chromePath = """C:\Program Files\Google\Chrome\Application\chrome.exe"""
ElseIf fso.FileExists("C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") Then
    chromePath = """C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"""
Else
    MsgBox "Chrome not found! Please install Google Chrome.", vbExclamation, "BulkListingPro"
    WScript.Quit
End If

' Check if Chrome is already running
On Error Resume Next
isRunning = False
Dim objWMI, colProcesses, objProcess
Set objWMI = GetObject("winmgmts:\\.\root\cimv2")
Set colProcesses = objWMI.ExecQuery("Select * from Win32_Process Where Name = 'chrome.exe'")
If colProcesses.Count > 0 Then
    isRunning = True
End If
On Error GoTo 0

If isRunning Then
    Dim result
    result = MsgBox("Chrome is already running!" & vbCrLf & vbCrLf & _
                    "BulkListingPro requires Chrome to be started with a special flag." & vbCrLf & vbCrLf & _
                    "Would you like to close Chrome and relaunch it correctly?", _
                    vbYesNo + vbQuestion, "BulkListingPro")

    If result = vbYes Then
        ' Kill all Chrome processes
        WshShell.Run "taskkill /F /IM chrome.exe /T", 0, True
        WScript.Sleep 3000
    Else
        WScript.Quit
    End If
End If

' Use dedicated Chrome profile for BulkListingPro (required by Chrome 139+)
userDataDir = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\BulkListingPro\ChromeProfile"

' Create directory if it doesn't exist
If Not fso.FolderExists(userDataDir) Then
    fso.CreateFolder WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\BulkListingPro"
    fso.CreateFolder userDataDir
End If

' Launch Chrome with debug port and dedicated profile
WshShell.Run chromePath & " --remote-debugging-port=9222 --remote-allow-origins=* ""--user-data-dir=" & userDataDir & """", 1, False

Set WshShell = Nothing
Set fso = Nothing
