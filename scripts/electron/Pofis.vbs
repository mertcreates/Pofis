Option Explicit
Dim shell, files, root, electron
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(files.GetParentFolderName(files.GetParentFolderName(WScript.ScriptFullName)))
electron = root & "\node_modules\electron\dist\electron.exe"
If Not files.FileExists(electron) Then
  MsgBox "Once gelistirme bilgisayarinda bun run desktop:prepare calistirin.", vbExclamation, "Pofis"
  WScript.Quit 1
End If
shell.Environment("Process").Remove "ELECTRON_RUN_AS_NODE"
shell.CurrentDirectory = root
shell.Run """" & electron & """ """ & root & "\electron" & """", 1, False
